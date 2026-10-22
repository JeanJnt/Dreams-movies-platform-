"use server";

// Server Actions : fonctions appelées depuis le navigateur mais exécutées sur le serveur.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteEvent, saveEvent } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupBarcode, searchFilms } from "@/lib/barcode";
import { CASE_TYPES, FORMATS, setOwned, type CaseType } from "@/lib/collection";
import { ensureFilmFromTmdb } from "@/lib/tmdb-film";
import { deleteCritique, saveCritique } from "@/lib/critiques";
import { randomUUID } from "node:crypto";
import { addFile, addYoutube, deleteMedia, MIME, registerUploaded, saveImage, setMediaVisibility } from "@/lib/media";
import { mediaPath, blobEnabled } from "@/lib/storage";
import { posterOptions, setCustomPoster, setUploadedPoster, uploadPoster } from "@/lib/posters";
import { searchMyFilms } from "@/lib/queries";
import { ALERT_SOURCES } from "@/lib/alert-sources";
import { quickCheck } from "@/lib/alerts";
import { deleteUserList, saveUserList, setListShare } from "@/lib/user-lists";
import { PLATFORMS, setMyPlatforms } from "@/lib/reco";

export type CritiqueInput = {
  id?: number;
  filmId: number;
  title: string;
  lede: string;
  body: string;
  rating: number | null;
  status: "draft" | "published";
  visibility: "membres" | "prive";
};

export async function saveCritiqueAction(input: CritiqueInput) {
  await requireUser();
  const rating = input.rating != null && input.rating >= 0.5 && input.rating <= 5 ? Math.round(input.rating * 2) / 2 : null;
  const visibility = input.visibility === "prive" ? "prive" : "membres";
  const id = await saveCritique({ ...input, rating, visibility });
  revalidatePath(`/film/${input.filmId}`);
  revalidatePath("/critiques");
  revalidatePath(`/critiques/${id}`);
  return { id, savedAt: new Date().toISOString() };
}

export async function setOwnedAction(filmId: number, item: { format: string; caseType: string; edition: string | null; cover: string | null; ean?: string | null } | null) {
  await requireUser();
  if (item) {
    if (!(FORMATS as readonly string[]).includes(item.format)) throw new Error("Format inconnu");
    if (!CASE_TYPES.some((c) => c.key === item.caseType)) throw new Error("Boîtier inconnu");
    if (item.cover && !/^(https:\/\/|\/media\/)/.test(item.cover)) throw new Error("Jaquette invalide");
  }
  await setOwned(filmId, item ? { ...item, caseType: item.caseType as CaseType } : null);
  revalidatePath(`/film/${filmId}`);
  revalidatePath("/collection");
}

// Photo de ma jaquette, prise avec le téléphone ou envoyée depuis l ordinateur.
export async function uploadCoverAction(filmId: number, formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("cover");
  if (!(file instanceof File) || !file.size) return { error: "Choisis une image." };
  try {
    return { url: await saveImage(filmId, file, "cover") };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// --- Scanner de code-barres ---

export async function lookupBarcodeAction(ean: string) {
  await requireUser();
  if (!/^\d{8,14}$/.test(ean)) throw new Error("Code-barres invalide");
  const product = await lookupBarcode(ean);
  return { product, candidates: await searchFilms(product.query) };
}

export async function searchFilmsAction(query: string) {
  await requireUser();
  return searchFilms(query.slice(0, 120));
}

export async function addScannedAction(tmdbId: number, item: { format: string; caseType: string; edition: string | null; cover: string | null; ean: string | null }) {
  await requireUser();
  const filmId = await ensureFilmFromTmdb(tmdbId);
  await setOwnedAction(filmId, item);
  return filmId;
}

// --- Agenda des séances ---

export async function saveEventAction(e: { id?: number; filmId: number | null; title: string; startsAt: string; place: string | null; withWhom: string | null; note: string | null; guestIds?: number[] }) {
  await requireUser();
  if (!e.title.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e.startsAt)) throw new Error("Titre et date obligatoires");
  const id = await saveEvent(e);
  revalidatePath("/agenda");
  revalidatePath("/");
  return id;
}

export async function deleteEventAction(id: number) {
  await requireUser();
  await deleteEvent(id);
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function searchMyFilmsAction(q: string) {
  await requireUser();
  return searchMyFilms(q.slice(0, 80));
}

export async function setPlatformsAction(keys: string[]) {
  await requireUser();
  const valid = PLATFORMS.map((p) => p.key as string);
  await setMyPlatforms(keys.filter((k) => valid.includes(k)));
  revalidatePath("/conseils");
}

export async function addMediaAction(filmId: number, formData: FormData): Promise<{ error?: string }> {
  try {
    const caption = String(formData.get("caption") ?? "").trim() || null;
    const link = String(formData.get("youtube") ?? "").trim();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const visibility = formData.get("visibility") === "prive" ? "prive" : "membres";
    if (link) await addYoutube(filmId, link, caption, visibility);
    for (const file of files) await addFile(filmId, file, caption, visibility);
    if (!link && !files.length) return { error: "Choisis un fichier ou colle un lien YouTube." };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/film/${filmId}`);
  return {};
}

export async function deleteMediaAction(id: number) {
  await requireUser();
  const filmId = await deleteMedia(id);
  if (filmId) revalidatePath(`/film/${filmId}`);
}

export async function setMediaVisibilityAction(id: number, filmId: number, visibility: "membres" | "prive") {
  await requireUser();
  await setMediaVisibility(id, visibility === "prive" ? "prive" : "membres");
  revalidatePath(`/film/${filmId}`);
}

export async function posterOptionsAction(filmId: number) {
  await requireUser();
  return posterOptions(filmId);
}

export async function setPosterAction(filmId: number, posterPath: string | null) {
  await requireUser();
  await setCustomPoster(filmId, posterPath);
  revalidatePath("/", "layout"); // l'affiche apparaît sur beaucoup de pages
}

export async function uploadPosterAction(filmId: number, formData: FormData): Promise<{ error?: string }> {
  const file = formData.get("poster");
  if (!(file instanceof File) || !file.size) return { error: "Choisis une image." };
  try {
    await uploadPoster(filmId, file);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function deleteCritiqueAction(id: number, filmId: number) {
  await requireUser();
  await deleteCritique(id);
  revalidatePath(`/film/${filmId}`);
  revalidatePath("/critiques");
  redirect(`/film/${filmId}`);
}

// --- Envoi de fichiers (en ligne : directement du navigateur vers Vercel Blob) ---

export async function uploadTargetAction(filmId: number, fileName: string, prefix: "media" | "cover" | "poster") {
  const me = await requireUser();
  const ext = (fileName.match(/\.\w+$/)?.[0] ?? ".jpg").toLowerCase();
  const name = `${prefix === "media" ? "" : `${prefix}-`}${randomUUID()}${ext}`;
  const contentType = MIME[ext];
  if (!contentType) throw new Error("Format non pris en charge.");
  return { mode: blobEnabled() ? ("blob" as const) : ("local" as const), pathname: mediaPath(me.id, filmId, name), name, contentType, url: `/media/${me.id}/${filmId}/${name}` };
}

export async function registerMediaAction(filmId: number, name: string, caption: string | null, visibility: "membres" | "prive") {
  await requireUser();
  await registerUploaded(filmId, name, caption?.slice(0, 300) || null, visibility === "prive" ? "prive" : "membres");
  revalidatePath(`/film/${filmId}`);
}

export async function setUploadedPosterAction(filmId: number, url: string) {
  await requireUser();
  await setUploadedPoster(filmId, url);
  revalidatePath("/", "layout");
}

// --- Choisir des films (collection, top 10, listes) ---

// Les clés du sélecteur de films : « f123 » = film déjà dans Dreams, « t456 » = film TMDB (ajouté au catalogue au besoin).
async function resolveFilmKeys(keys: string[]) {
  const ids: number[] = [];
  for (const key of keys.slice(0, 200)) {
    const n = Number(key.slice(1));
    if (!Number.isInteger(n) || n <= 0) continue;
    if (key[0] === "f") ids.push(n);
    else if (key[0] === "t") ids.push(await ensureFilmFromTmdb(n));
  }
  return [...new Set(ids)];
}

// Ajoute plusieurs films d'un coup à ma collection (ceux que j'ai déjà gardent leur jaquette et leur format).
export async function addManyOwnedAction(keys: string[], format: string, caseType: string) {
  const me = await requireUser();
  if (!(FORMATS as readonly string[]).includes(format)) return { error: "Format inconnu." };
  const type = (CASE_TYPES.some((c) => c.key === caseType) ? caseType : "amaray") as CaseType;
  const ids = await resolveFilmKeys(keys);
  const { rows } = await db().execute({ sql: `SELECT film_id FROM owned WHERE user_id = ?`, args: [me.id] });
  const have = new Set(rows.map((r) => Number(r.film_id)));
  let added = 0;
  for (const id of ids) {
    if (have.has(id)) continue;
    await setOwned(id, { format, caseType: type, edition: null, cover: null });
    added++;
  }
  revalidatePath("/collection");
  return { added };
}

// --- Mes listes (créées dans Dreams) ---

export async function saveUserListAction(input: { id?: number; name: string; description: string; visibility: string; keys: string[] }) {
  await requireUser();
  const name = input.name.trim().slice(0, 120);
  if (!name) return { error: "Donne un nom à ta liste." };
  const filmIds = await resolveFilmKeys(input.keys.slice(0, 500));
  const id = await saveUserList({ id: input.id, name, description: input.description.trim().slice(0, 2000) || null, visibility: input.visibility, filmIds });
  revalidatePath("/listes");
  return { id };
}

export async function deleteUserListAction(id: number) {
  await requireUser();
  await deleteUserList(id);
  revalidatePath("/listes");
  redirect("/listes");
}

export async function shareUserListAction(id: number, on: boolean) {
  await requireUser();
  const token = await setListShare(id, on);
  revalidatePath(`/listes/perso/${id}`);
  return { token };
}

// Mes 10 films préférés, dans l'ordre choisi.
export async function setTopFilmsAction(keys: string[]) {
  const me = await requireUser();
  const ids = (await resolveFilmKeys(keys.slice(0, 10))).slice(0, 10);
  await db().batch(
    [
      { sql: "DELETE FROM top_films WHERE user_id = ?", args: [me.id] },
      ...ids.map((id, i) => ({ sql: "INSERT INTO top_films (user_id, film_id, position) VALUES (?, ?, ?)", args: [me.id, id, i + 1] })),
    ],
    "write",
  );
  revalidatePath("/", "layout");
  return { saved: ids.length };
}

// --- Réglages des alertes cinéma ---

export async function setAlertSourcesAction(keys: string[]) {
  const me = await requireUser();
  const valid = ALERT_SOURCES.filter((s) => keys.includes(s.key)).map((s) => s.key);
  await db().execute({ sql: "UPDATE users SET alert_sources = ? WHERE id = ?", args: [valid.join(","), me.id] });
  await quickCheck(me.id).catch(() => 0); // recalcule tout de suite les alertes avec ces réglages
  revalidatePath("/alertes");
  revalidatePath("/", "layout");
}
