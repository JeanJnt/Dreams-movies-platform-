import Link from "next/link";
import { caseSize } from "@/lib/case-thickness";

/*
 * Une rangée de tranches de DVD, dessinées en HTML (légères, nettes, accessibles) :
 * chaque tranche a la largeur réelle de son boîtier (7 à 27 mm) et le système graphique de la collection
 * — étoile argent, numéro, titre couché, réalisateur. Au survol, la tranche sort du rang.
 */
export type SpineFilm = { id: number; title: string; director: string | null; runtime: number | null; edition?: string | null; caseType?: string | null; color?: string | null; href: string };

const PX_PER_MM = 2.6;
// la tranche prend la couleur profonde du film (comme sur les jaquettes) ; jamais celle du thème du site
function spineColors(f: SpineFilm) {
  const c = f.color && /^#[0-9a-f]{6}$/i.test(f.color) ? f.color : "#3b3632";
  return { bg: `color-mix(in srgb, ${c} 38%, #070707)`, ink: "#ece8e0" };
}

export function SpineRow({ films, height = 300 }: { films: SpineFilm[]; height?: number }) {
  return (
    <ul className="spine-row flex items-end" style={{ height }} aria-label="Tranches de la collection">
      {films.map((f) => {
        const size = caseSize({ runtime: f.runtime, edition: f.edition, caseType: f.caseType });
        const c = spineColors(f);
        return (
          <li key={f.id} className="h-full">
            <Link href={f.href} className="spine" style={{ width: size.mm * PX_PER_MM, "--spine-bg": c.bg, "--spine-ink": c.ink } as React.CSSProperties} title={`${f.title} — boîtier ${size.name.toLowerCase()} (${size.mm} mm)`}>
              <span className="spine-star" aria-hidden />
              <span className="spine-num tabular">{String(f.id).padStart(4, "0")}</span>
              <span className="spine-title">
                {f.title}
                {size.mm >= 14 && f.director && <span className="spine-dir">{f.director}</span>}
              </span>
              <span className="sr-only">, boîtier {size.name.toLowerCase()}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
