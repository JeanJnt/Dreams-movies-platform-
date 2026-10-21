import { createClient, type Client } from "@libsql/client";

// Base SQLite locale (data/bobine.db). Plus tard, il suffira de changer
// DATABASE_URL pour une base Turso en ligne, et PC + mobile seront synchronisés.
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

export const SCHEMA = [
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
  `CREATE TABLE IF NOT EXISTS watched (film_id INTEGER PRIMARY KEY, date TEXT)`,
  `CREATE TABLE IF NOT EXISTS ratings (film_id INTEGER PRIMARY KEY, rating REAL, date TEXT)`,
  `CREATE TABLE IF NOT EXISTS likes (film_id INTEGER PRIMARY KEY, date TEXT)`,
  `CREATE TABLE IF NOT EXISTS watchlist (film_id INTEGER PRIMARY KEY, date TEXT)`,
  `CREATE TABLE IF NOT EXISTS diary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    logged_date TEXT,
    watched_date TEXT,
    rating REAL,
    rewatch INTEGER DEFAULT 0,
    tags TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    date TEXT,
    watched_date TEXT,
    rating REAL,
    rewatch INTEGER DEFAULT 0,
    review TEXT,
    tags TEXT,
    source TEXT DEFAULT 'letterboxd'   -- 'letterboxd' ou 'bobine'
  )`,
  `CREATE TABLE IF NOT EXISTS lists (slug TEXT PRIMARY KEY, name TEXT, description TEXT, date TEXT)`,
  `CREATE TABLE IF NOT EXISTS list_items (list_slug TEXT, film_id INTEGER, position INTEGER, PRIMARY KEY (list_slug, film_id))`,
  // Les vraies critiques, écrites dans Dreams (texte long en Markdown).
  `CREATE TABLE IF NOT EXISTS critiques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    lede TEXT NOT NULL DEFAULT '',     -- le chapô : 2-3 phrases d'accroche
    body TEXT NOT NULL DEFAULT '',
    rating REAL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' ou 'published'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_critiques_film ON critiques(film_id)`,
  // Les films que je possède (Blu-ray, DVD…).
  `CREATE TABLE IF NOT EXISTS owned (
    film_id INTEGER PRIMARY KEY,
    format TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Mes images et vidéos sur un film : fichier envoyé (data/media) ou lien YouTube.
  `CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    kind TEXT NOT NULL,                -- 'image', 'video' ou 'youtube'
    src TEXT NOT NULL,                 -- nom du fichier, ou identifiant YouTube
    caption TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_media_film ON media(film_id)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  // Plateformes d'abonnement en France pour chaque film TMDB : JSON [{ name, logo }].
  `CREATE TABLE IF NOT EXISTS providers (tmdb_id INTEGER PRIMARY KEY, flatrate TEXT NOT NULL, fetched_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  // Films recommandés (calculés par npm run reco à partir de mes films préférés).
  `CREATE TABLE IF NOT EXISTS reco (
    tmdb_id INTEGER PRIMARY KEY,
    score REAL NOT NULL,
    reasons TEXT,                      -- JSON : les films aimés qui ont mené à cette reco
    title TEXT, original_title TEXT, year INTEGER,
    poster_path TEXT, runtime INTEGER, genres TEXT, directors TEXT,
    vote_average REAL, vote_count INTEGER, overview TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_diary_film ON diary(film_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_film ON reviews(film_id)`,
];

// Colonnes ajoutées après coup : SQLite n'a pas « ADD COLUMN IF NOT EXISTS », donc on ignore l'erreur si elle existe déjà.
const MIGRATIONS = [
  "ALTER TABLE films ADD COLUMN custom_poster TEXT", // affiche choisie à la main (chemin TMDB ou /media/…)
  // Collection physique : le boîtier, l'édition et la vraie jaquette de mon exemplaire
  "ALTER TABLE owned ADD COLUMN case_type TEXT", // 'amaray', 'steelbook', 'digipack', 'coffret'
  "ALTER TABLE owned ADD COLUMN edition TEXT", // ex. « Criterion », « Carlotta — version restaurée »
  "ALTER TABLE owned ADD COLUMN cover TEXT", // URL de la jaquette (scan, TMDB ou photo envoyée)
  "ALTER TABLE owned ADD COLUMN ean TEXT", // code-barres scanné
];

// Tables ajoutées pour l'agenda et les alertes.
SCHEMA.push(
  // Mes prochaines séances (au cinéma ou à la maison)
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER,
    title TEXT NOT NULL,
    starts_at TEXT NOT NULL,           -- « 2026-11-02T20:30 », heure de Paris
    place TEXT,                        -- cinéma ou « À la maison »
    with_whom TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Films de ma watchlist ou de mes coups de cœur qui passent (ou vont passer) en salle
  `CREATE TABLE IF NOT EXISTS alerts (
    tmdb_id INTEGER PRIMARY KEY,
    film_id INTEGER,
    kind TEXT NOT NULL,                -- 'en_salle', 'bientot', 'ressortie'
    release_date TEXT,
    note TEXT,
    source TEXT,                       -- 'watchlist' ou 'coup_de_coeur'
    seen INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
);

export async function ensureSchema() {
  await db().batch(SCHEMA, "write");
  for (const sql of MIGRATIONS) {
    await db().execute(sql).catch((e: Error) => {
      if (!/duplicate column/i.test(e.message)) throw e;
    });
  }
}
