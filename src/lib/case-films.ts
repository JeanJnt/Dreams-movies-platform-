import { viewedUser } from "./auth";
import { countryFr } from "./format";
import { db } from "./db";
import { designsFor } from "./designs";
import type { CaseFilm } from "@/components/three/cases/art";

const json = <T,>(v: unknown, f: T): T => { try { return v ? (JSON.parse(String(v)) as T) : f; } catch { return f; } };
const names = (v: unknown) => json<unknown[]>(v, []).map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name ?? "")).filter(Boolean);

// Les films sous la forme attendue par les boîtiers 3D (avec synopsis, distribution, couleur dominante).
// Chaque film porte le design (boîtier, disque) choisi par le membre — userId : celui d'un autre membre, sur son profil.
export async function caseFilms(ids: number[], base = "/film", userId?: number): Promise<CaseFilm[]> {
  if (!ids.length) return [];
  const designs = await designsFor(ids, await viewedUser(userId));
  const { rows } = await db().execute(`SELECT id, name, title_fr, original_title, year, poster_path, backdrop_path, overview, runtime, genres, directors, cast_list, countries, disc_color FROM films WHERE id IN (${ids.map(Number).join(",")})`);
  const by = new Map(rows.map((r) => [Number(r.id), r]));
  return ids.flatMap((id) => {
    const r = by.get(id);
    if (!r) return [];
    return [{
      id,
      title: String(r.title_fr ?? r.name),
      originalTitle: (r.original_title as string) ?? null,
      year: r.year == null ? null : Number(r.year),
      director: names(r.directors)[0] ?? null,
      poster: (r.poster_path as string) ?? null,
      backdrop: (r.backdrop_path as string) ?? null,
      overview: (r.overview as string) ?? null,
      runtime: r.runtime == null ? null : Number(r.runtime),
      cast: names(r.cast_list).slice(0, 6),
      genres: json<string[]>(r.genres, []),
      countries: json<string[]>(r.countries, []).map(countryFr),
      color: (r.disc_color as string) ?? null,
      href: `${base}/${id}`,
      design: designs.get(id),
    }];
  });
}
