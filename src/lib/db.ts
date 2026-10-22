import { createClient, type Client } from "@libsql/client";

// Base SQLite : fichier local (data/bobine.db) en développement, base Turso en ligne en production
// (il suffit de changer DATABASE_URL et DATABASE_AUTH_TOKEN).
let client: Client | undefined;

export function db(): Client {
  if (!client) {
    client = createClient({
      url: process.env.DATABASE_URL ?? "file:data/bobine.db",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return client;
}

/*
 * Organisation des données
 * - Partagé entre tous : le catalogue de films (infos TMDB) et les plateformes de streaming.
 * - Propre à chaque utilisateur (colonne user_id) : tout le reste.
 *   user_id = 0 désigne les données importées avant la création des comptes : le premier compte créé les récupère.
 */
const SHARED = [
  `CREATE TABLE IF NOT EXISTS films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,          -- "nom|année", identifiant stable entre les CSV
    name TEXT NOT NULL,
    year INTEGER,
    lb_uri TEXT,
    tmdb_id INTEGER,
    title_fr TEXT,
    original_title TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    overview TEXT,
    runtime INTEGER,
    genres TEXT,                       -- JSON ["Drame", ...]
    directors TEXT,                    -- JSON
    cast_list TEXT,                    -- JSON
    countries TEXT,                    -- JSON
    original_language TEXT,
    tmdb_status TEXT                   -- null = à enrichir, 'ok', 'not_found'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_films_tmdb ON films(tmdb_id)`,
  `CREATE INDEX IF NOT EXISTS idx_films_status ON films(tmdb_status)`,
  // Plateformes d'abonnement en France pour chaque film TMDB : JSON [{ name, logo }].
  `CREATE TABLE IF NOT EXISTS providers (tmdb_id INTEGER PRIMARY KEY, flatrate TEXT NOT NULL, fetched_at TEXT NOT NULL DEFAULT (datetime('now')))`,

  // --- Comptes ---
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,       -- scrypt, jamais le mot de passe en clair
    is_admin INTEGER NOT NULL DEFAULT 0,
    calendar_token TEXT,               -- lien secret pour s'abonner à son agenda (.ics)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,               -- empreinte SHA-256 du jeton (le jeton lui-même n'est que dans le cookie)
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    user_agent TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    created_by INTEGER NOT NULL,
    note TEXT,
    used_by INTEGER,
    used_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Listes de référence (Sight and Sound, Top Letterboxd…) : communes à tous, chacun y voit sa progression
  `CREATE TABLE IF NOT EXISTS ref_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT,                       -- 'tmdb-list', 'tmdb-top', 'letterboxd-csv'
    source_url TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS ref_list_items (list_id INTEGER NOT NULL, film_id INTEGER NOT NULL, rank INTEGER, PRIMARY KEY (list_id, film_id))`,
  // Tentatives de connexion ratées, pour bloquer les essais de mots de passe en rafale
  `CREATE TABLE IF NOT EXISTS login_attempts (key TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(key, at)`,
];

// Tables propres à chaque utilisateur, avec la liste de leurs colonnes de données (pour la migration).
const PER_USER: { name: string; create: string; columns: string[]; indexes?: string[] }[] = [
  { name: "watched", create: `CREATE TABLE IF NOT EXISTS watched (user_id INTEGER NOT NULL, film_id INTEGER NOT NULL, date TEXT, PRIMARY KEY (user_id, film_id))`, columns: ["film_id", "date"] },
  { name: "ratings", create: `CREATE TABLE IF NOT EXISTS ratings (user_id INTEGER NOT NULL, film_id INTEGER NOT NULL, rating REAL, date TEXT, PRIMARY KEY (user_id, film_id))`, columns: ["film_id", "rating", "date"] },
  { name: "likes", create: `CREATE TABLE IF NOT EXISTS likes (user_id INTEGER NOT NULL, film_id INTEGER NOT NULL, date TEXT, PRIMARY KEY (user_id, film_id))`, columns: ["film_id", "date"] },
  { name: "watchlist", create: `CREATE TABLE IF NOT EXISTS watchlist (user_id INTEGER NOT NULL, film_id INTEGER NOT NULL, date TEXT, PRIMARY KEY (user_id, film_id))`, columns: ["film_id", "date"] },
  {
    name: "diary",
    create: `CREATE TABLE IF NOT EXISTS diary (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, film_id INTEGER NOT NULL,
      logged_date TEXT, watched_date TEXT, rating REAL, rewatch INTEGER DEFAULT 0, tags TEXT)`,
    columns: ["film_id", "logged_date", "watched_date", "rating", "rewatch", "tags"],
    indexes: [`CREATE INDEX IF NOT EXISTS idx_diary_user ON diary(user_id, watched_date)`, `CREATE INDEX IF NOT EXISTS idx_diary_film ON diary(film_id)`],
  },
  {
    name: "reviews",
    create: `CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, film_id INTEGER NOT NULL,
      date TEXT, watched_date TEXT, rating REAL, rewatch INTEGER DEFAULT 0, review TEXT, tags TEXT, source TEXT DEFAULT 'letterboxd')`,
    columns: ["film_id", "date", "watched_date", "rating", "rewatch", "review", "tags", "source"],
    indexes: [`CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id, film_id)`],
  },
  { name: "lists", create: `CREATE TABLE IF NOT EXISTS lists (user_id INTEGER NOT NULL, slug TEXT NOT NULL, name TEXT, description TEXT, date TEXT, PRIMARY KEY (user_id, slug))`, columns: ["slug", "name", "description", "date"] },
  {
    name: "list_items",
    create: `CREATE TABLE IF NOT EXISTS list_items (user_id INTEGER NOT NULL, list_slug TEXT NOT NULL, film_id INTEGER NOT NULL, position INTEGER, PRIMARY KEY (user_id, list_slug, film_id))`,
    columns: ["list_slug", "film_id", "position"],
  },
  {
    // Les vraies critiques, écrites dans Dreams (texte long en Markdown)
    name: "critiques",
    create: `CREATE TABLE IF NOT EXISTS critiques (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, film_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '', lede TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', rating REAL,
      status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    columns: ["film_id", "title", "lede", "body", "rating", "status", "created_at", "updated_at"],
    indexes: [`CREATE INDEX IF NOT EXISTS idx_critiques_user ON critiques(user_id, film_id)`],
  },
  {
    // Collection physique : format, boîtier, édition, jaquette
    name: "owned",
    create: `CREATE TABLE IF NOT EXISTS owned (user_id INTEGER NOT NULL, film_id INTEGER NOT NULL, format TEXT NOT NULL,
      case_type TEXT, edition TEXT, cover TEXT, ean TEXT, added_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, film_id))`,
    columns: ["film_id", "format", "case_type", "edition", "cover", "ean", "added_at"],
  },
  {
    // Mes images et vidéos sur un film : fichier envoyé ou lien YouTube
    name: "media",
    create: `CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, film_id INTEGER NOT NULL,
      kind TEXT NOT NULL, src TEXT NOT NULL, caption TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    columns: ["film_id", "kind", "src", "caption", "created_at"],
    indexes: [`CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id, film_id)`],
  },
  { name: "settings", create: `CREATE TABLE IF NOT EXISTS settings (user_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT, PRIMARY KEY (user_id, key))`, columns: ["key", "value"] },
  {
    // Films recommandés, calculés à partir des favoris de chacun
    name: "reco",
    create: `CREATE TABLE IF NOT EXISTS reco (user_id INTEGER NOT NULL, tmdb_id INTEGER NOT NULL, score REAL NOT NULL, reasons TEXT,
      title TEXT, original_title TEXT, year INTEGER, poster_path TEXT, runtime INTEGER, genres TEXT, directors TEXT,
      vote_average REAL, vote_count INTEGER, overview TEXT, PRIMARY KEY (user_id, tmdb_id))`,
    columns: ["tmdb_id", "score", "reasons", "title", "original_title", "year", "poster_path", "runtime", "genres", "directors", "vote_average", "vote_count", "overview"],
  },
  {
    // Séances prévues (au cinéma ou à la maison)
    name: "events",
    create: `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, film_id INTEGER, title TEXT NOT NULL,
      starts_at TEXT NOT NULL, place TEXT, with_whom TEXT, note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    columns: ["film_id", "title", "starts_at", "place", "with_whom", "note", "created_at"],
    indexes: [`CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, starts_at)`],
  },
  {
    // Films de la watchlist ou des coups de cœur qui passent en salle
    name: "alerts",
    create: `CREATE TABLE IF NOT EXISTS alerts (user_id INTEGER NOT NULL, tmdb_id INTEGER NOT NULL, film_id INTEGER, kind TEXT NOT NULL,
      release_date TEXT, note TEXT, source TEXT, seen INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, tmdb_id))`,
    columns: ["tmdb_id", "film_id", "kind", "release_date", "note", "source", "seen", "created_at"],
  },
  {
    // Affiche choisie par chacun pour un film (chemin TMDB ou image envoyée)
    name: "user_posters",
    create: `CREATE TABLE IF NOT EXISTS user_posters (user_id INTEGER NOT NULL, film_id INTEGER NOT NULL, poster TEXT NOT NULL, PRIMARY KEY (user_id, film_id))`,
    columns: ["film_id", "poster"],
  },
];

// Toutes les tables d'un utilisateur (pour l'export, la suppression du compte et la reprise des données).
export const USER_TABLES = PER_USER.map((t) => t.name);

async function columns(table: string) {
  const { rows } = await db().execute(`PRAGMA table_info(${table})`);
  return rows.map((r) => String(r.name));
}

// Passage d'une base « un seul utilisateur » à une base multi-comptes : chaque table reçoit une colonne user_id.
// Les données existantes sont rangées sous user_id = 0, en attendant le premier compte.
async function migrateToAccounts() {
  const existing = new Set((await db().execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((r) => String(r.name)));
  const statements: string[] = [];

  for (const t of PER_USER) {
    if (!existing.has(t.name)) continue;
    const cols = await columns(t.name);
    if (cols.includes("user_id")) continue;
    const copy = t.columns.filter((c) => cols.includes(c));
    statements.push(
      `ALTER TABLE ${t.name} RENAME TO ${t.name}_v1`,
      t.create,
      `INSERT INTO ${t.name} (user_id, ${copy.join(", ")}) SELECT 0, ${copy.join(", ")} FROM ${t.name}_v1`,
      `DROP TABLE ${t.name}_v1`,
    );
  }
  // Les affiches personnalisées étaient rangées dans le catalogue partagé : elles deviennent celles du premier compte.
  if (existing.has("films") && (await columns("films")).includes("custom_poster")) {
    statements.push(
      PER_USER.find((t) => t.name === "user_posters")!.create,
      `INSERT OR IGNORE INTO user_posters (user_id, film_id, poster) SELECT 0, id, custom_poster FROM films WHERE custom_poster IS NOT NULL`,
      `UPDATE films SET custom_poster = NULL`,
    );
  }
  if (statements.length) await db().batch(statements, "write");
}

// Colonnes ajoutées après coup (SQLite n'a pas « ADD COLUMN IF NOT EXISTS » : on vérifie avant).
const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  // Visibilité pour les autres membres : 'membres' (visible) ou 'prive'
  ["critiques", "visibility", "TEXT NOT NULL DEFAULT 'membres'"],
  ["media", "visibility", "TEXT NOT NULL DEFAULT 'membres'"],
  // Synchronisation automatique avec le flux public Letterboxd du membre
  ["users", "letterboxd_username", "TEXT"],
  ["users", "letterboxd_synced_at", "TEXT"],
];

let ready: Promise<void> | undefined;

// En ligne, plusieurs copies du serveur démarrent en même temps : deux peuvent tenter la même modification.
// On ignore donc les erreurs « déjà fait », et on ne garde jamais un échec en mémoire (on réessaiera au prochain appel).
const alreadyDone = (e: unknown) => /duplicate column|already exists/i.test(String((e as Error)?.message ?? e));

export function ensureSchema() {
  ready ??= (async () => {
    await db().batch(SHARED, "write");
    await migrateToAccounts();
    await db().batch([...PER_USER.map((t) => t.create), ...PER_USER.flatMap((t) => t.indexes ?? [])], "write");
    for (const [table, column, definition] of ADDED_COLUMNS) {
      if ((await columns(table)).includes(column)) continue;
      await db().execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).catch((e) => {
        if (!alreadyDone(e)) throw e;
      });
    }
  })().catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}

// L'affiche d'un film pour un utilisateur : la sienne s'il en a choisi une, sinon celle de TMDB.
// uid est toujours un entier issu de la session (jamais une saisie), on peut l'insérer tel quel.
export const posterSql = (uid: number) =>
  `COALESCE((SELECT up.poster FROM user_posters up WHERE up.user_id = ${Number(uid)} AND up.film_id = f.id), f.poster_path)`;
