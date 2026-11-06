import Link from "next/link";
import { caseSize } from "@/lib/case-thickness";
import type { ObjectDesign } from "@/lib/design-types";
import { spineLook } from "@/lib/jacket-palette";

/*
 * Une rangée de tranches de DVD, dessinées en HTML (légères, nettes, accessibles) :
 * chaque tranche a la largeur réelle de son boîtier (7 à 27 mm) et la tranche de sa jaquette :
 * papier, couleur franche du film, noir, crème… selon la maquette du film ou le design du membre.
 * Les couleurs viennent du film (et des choix du membre), jamais du hasard ni du thème du site.
 */
export type SpineFilm = { id: number; title: string; director: string | null; runtime: number | null; edition?: string | null; caseType?: string | null; color?: string | null; backdrop?: string | null; poster?: string | null; design?: ObjectDesign; href: string };

const PX_PER_MM = 2.6;

export function SpineRow({ films, height = 300 }: { films: SpineFilm[]; height?: number }) {
  return (
    <ul className="spine-row flex items-end" style={{ height }} aria-label="Tranches de la collection">
      {films.map((f) => {
        const size = caseSize({ runtime: f.runtime, edition: f.edition, caseType: f.caseType });
        const look = spineLook({ ...f, backdrop: f.backdrop ?? null, poster: f.poster ?? null });
        return (
          <li key={f.id} className="h-full">
            <Link
              href={f.href}
              className="spine"
              data-look={look.style}
              style={{ width: size.mm * PX_PER_MM, "--spine-bg": look.bg, "--spine-ink": look.ink } as React.CSSProperties}
              title={look.title}
            >
              <span className="spine-star" aria-hidden />
              {look.showNumber && <span className="spine-num tabular">{look.num}</span>}
              <span className="spine-title">
                {look.title}
                {size.mm >= 14 && look.dir && <span className="spine-dir">{look.dir}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
