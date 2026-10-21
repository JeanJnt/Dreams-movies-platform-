"use server";

// Server Actions : fonctions appelées depuis le navigateur mais exécutées sur le serveur.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteEvent, saveEvent } from "@/lib/agenda";
import { quickCheck } from "@/lib/alerts";
import { lookupBarcode, searchFilms } from "@/lib/barcode";
import { CASE_TYPES, FORMATS, setOwned, type CaseType } from "@/lib/collection";
import { ensureFilmFromTmdb } from "@/lib/tmdb-film";
import { deleteCritique, saveCritique } from "@/lib/critiques";
import { addFile, addYoutube, deleteMedia, saveImage } from "@/lib/media";
import { posterOptions, setCustomPoster, uploadPoster } from "@/lib/posters";
import { searchMyFilms } from "@/lib/queries";
import { PLATFORMS, setMyPlatforms } from "@/lib/reco";

export type CritiqueInput = {
  id?: number;
  filmId: number;
  title: string;
  lede: string;
  body: string;
  rating: number | null;
  status: "draft" | "published";
};

export async function saveCritiqueAction(input: CritiqueInput) {
  const rating = input.rating != null && input.rating >= 0.5 && input.rating <= 5 ? Math.round(input.rating * 2) / 2 : null;
  const id = await saveCritique({ ...input, rating });
  revalidatePath(`/film/${input.filmId}`);
  revalidatePath("/critiques");
  revalidatePath(`/critiques/${id}`);
  return { id, savedAt: new Date().toISOString() };
}

export async function setOwnedAction(filmId: number, item: { format: string; caseType: string; edition: string | null; cover: string | null; ean?: string | null } | null) {
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
  if (!/^\d{8,14}$/.test(ean)) throw new Error("Code-barres invalide");
  const product = await lookupBarcode(ean);
  return { product, candidates: await searchFilms(product.query) };
}

export async function searchFilmsAction(query: string) {
  return searchFilms(query.slice(0, 120));
}

export async function addScannedAction(tmdbId: number, item: { format: string; caseType: string; edition: string | null; cover: string | null; ean: string | null }) {
  const filmId = await ensureFilmFromTmdb(tmdbId);
  await setOwnedAction(filmId, item);
  return filmId;
}

// --- Agenda des séances ---

export async function saveEventAction(e: { id?: number; filmId: number | null; title: string; startsAt: string; place: string | null; withWhom: string | null; note: string | null }) {
  if (!e.title.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e.startsAt)) throw new Error("Titre et date obligatoires");
  const id = await saveEvent(e);
  revalidatePath("/agenda");
  revalidatePath("/");
  return id;
}

export async function deleteEventAction(id: number) {
  await deleteEvent(id);
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function searchMyFilmsAction(q: string) {
  return searchMyFilms(q.slice(0, 80));
}

// --- Alertes cinéma ---

export async function refreshAlertsAction() {
  const n = await quickCheck();
  revalidatePath("/alertes");
  revalidatePath("/", "layout");
  return n;
}

export async function setPlatformsAction(keys: string[]) {
  const valid = PLATFORMS.map((p) => p.key as string);
  await setMyPlatforms(keys.filter((k) => valid.includes(k)));
  revalidatePath("/conseils");
}

export async function addMediaAction(filmId: number, formData: FormData): Promise<{ error?: string }> {
  try {
    const caption = String(formData.get("caption") ?? "").trim() || null;
    const link = String(formData.get("youtube") ?? "").trim();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (link) await addYoutube(filmId, link, caption);
    for (const file of files) await addFile(filmId, file, caption);
    if (!link && !files.length) return { error: "Choisis un fichier ou colle un lien YouTube." };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/film/${filmId}`);
  return {};
}

export async function deleteMediaAction(id: number) {
  const filmId = await deleteMedia(id);
  if (filmId) revalidatePath(`/film/${filmId}`);
}

export async function posterOptionsAction(filmId: number) {
  return posterOptions(filmId);
}

export async function setPosterAction(filmId: number, posterPath: string | null) {
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
  await deleteCritique(id);
  revalidatePath(`/film/${filmId}`);
  revalidatePath("/critiques");
  redirect(`/film/${filmId}`);
}
