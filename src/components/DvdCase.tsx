/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DiscLabel } from "./DiscLabel";

export type CaseFilm = {
  id: number;
  href: string;
  title: string;
  year: number | null;
  director: string | null;
  runtime: number | null;
  cover: string | null; // jaquette (affiche)
  image: string | null; // image large, pour l'étiquette du disque
  format?: string;
  caseType?: string; // amaray, steelbook, digipack, coffret
  seen?: boolean;
};

// Chaque format a son boîtier : proportions, couleur du plastique et bandeau du haut.
export const CASE_STYLES: Record<string, { ratio: string; plastic: string; band: string; bandText: string; label: string }> = {
  "Blu-ray 4K": { ratio: "135 / 171", plastic: "#0d0d0d", band: "#0d0d0d", bandText: "#fff", label: "4K ULTRA HD" },
  "Blu-ray": { ratio: "135 / 171", plastic: "#0a3f8f", band: "#1067d1", bandText: "#fff", label: "BLU-RAY" },
  DVD: { ratio: "135 / 190", plastic: "#111111", band: "#111111", bandText: "#fff", label: "DVD" },
  Numérique: { ratio: "135 / 190", plastic: "#3a3a3a", band: "#5b5b5b", bandText: "#fff", label: "NUMÉRIQUE" },
  VHS: { ratio: "105 / 190", plastic: "#1a1a1a", band: "#1a1a1a", bandText: "#e9e3d5", label: "VHS" },
};
export const caseStyle = (format?: string) => CASE_STYLES[format ?? "DVD"] ?? CASE_STYLES.DVD;

// Un boîtier en relief. Au survol, la jaquette pivote comme un vrai couvercle et révèle le disque.
// Le rendu change selon le type : boîtier plastique, steelbook en métal, digipack en carton, coffret épais.
export function DvdCase({ film, compact = false }: { film: CaseFilm; compact?: boolean }) {
  const s = caseStyle(film.format);
  const type = film.caseType ?? "amaray";
  const steel = type === "steelbook", digi = type === "digipack", box = type === "coffret";
  const shell = steel ? "linear-gradient(135deg,#d9d9d9,#8c8c8c 40%,#e6e6e6 55%,#7a7a7a)" : digi ? "#e9e1d0" : s.plastic;
  const radius = steel ? "10px" : digi ? "2px" : "6px";
  const Wrapper = compact ? "div" : Link;

  return (
    <Wrapper href={film.href} className={`dvd-case group block ${box ? "dvd-case--box" : ""}`} aria-label={film.title}>
      <div className="relative" style={{ aspectRatio: box ? "150 / 190" : s.ratio, perspective: "1200px" }}>
        {/* Intérieur du boîtier : le plateau et le disque */}
        <div className="absolute inset-0 overflow-hidden" style={{ background: digi ? "#d8ccb4" : s.plastic, borderRadius: radius }}>
          <div className="absolute inset-[6%] rounded-[4px] bg-[radial-gradient(circle_at_50%_50%,#ffffff14,transparent_70%)]" />
          <div className="absolute top-1/2 left-1/2 aspect-square w-[86%] -translate-x-1/2 -translate-y-1/2 transition duration-700 group-hover:rotate-[25deg]">
            <DiscLabel disc={{ id: film.id, title: film.title, year: film.year, director: film.director, runtime: film.runtime, image: film.image ?? film.cover, badge: film.format }} />
          </div>
        </div>

        {/* La jaquette, qui s'ouvre comme un couvercle */}
        <div className="dvd-cover absolute inset-0 origin-left transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(-105deg)]">
          <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" style={{ background: shell, borderRadius: radius }}>
            {/* Bandeau du format (sauf steelbook et digipack, où l'image couvre tout) */}
            {!steel && !digi && (
              <div className="relative z-10 flex h-[7.5%] items-center justify-center" style={{ background: s.band }}>
                <span className="text-[clamp(6px,1.4vw,10px)] font-bold tracking-[0.25em]" style={{ color: s.bandText }}>{s.label}</span>
              </div>
            )}
            <div
              className="absolute overflow-hidden bg-surface-2"
              style={steel ? { inset: "4%", borderRadius: "6px" } : digi ? { inset: 0 } : { left: "3%", right: "3%", top: "9%", bottom: "2%", borderRadius: "2px" }}
            >
              {film.cover ? (
                <img src={film.cover} alt="" loading="lazy" className={`size-full object-cover ${steel ? "contrast-110 saturate-[.85]" : ""}`} />
              ) : (
                <div className="flex size-full items-center justify-center p-2 text-center font-display text-sm text-white">{film.title}</div>
              )}
              {steel && <div className="absolute inset-0 bg-[linear-gradient(120deg,#ffffff00_20%,#ffffff55_35%,#ffffff00_50%,#ffffff22_70%,#ffffff00_80%)] mix-blend-overlay" />}
              {digi && <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22p%22%3E%3CfeTurbulence baseFrequency=%22.9%22/%3E%3CfeColorMatrix values=%220 0 0 0 .5 0 0 0 0 .45 0 0 0 0 .4 0 0 0 .18 0%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23p)%22/%3E%3C/svg%3E')] mix-blend-multiply" />}
              {(steel || digi) && film.format && (
                <span className="absolute top-1.5 right-1.5 rounded-sm bg-black/70 px-1 text-[clamp(5px,1.1vw,8px)] font-bold tracking-[0.2em] text-white">{s.label}</span>
              )}
            </div>
            {!steel && !digi && <div className="dvd-sheen pointer-events-none absolute inset-0" />}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[4%] bg-gradient-to-r from-black/50 via-white/10 to-transparent" />
          </div>
          {/* Dos du couvercle (visible quand il est ouvert) */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ background: shell, borderRadius: radius }}>
            <div className="absolute inset-[6%] rounded-[3px] border border-white/10" />
          </div>
        </div>
      </div>
      {!compact && (
        <>
          <p className="mt-2 line-clamp-1 text-sm group-hover:text-accent">{film.title}</p>
          <p className="text-xs text-muted">
            {[film.year, film.format, steel ? "Steelbook" : digi ? "Digipack" : box ? "Coffret" : null].filter(Boolean).join(" · ")}
            {film.seen === false && <span className="ml-1 text-accent">· pas vu</span>}
          </p>
        </>
      )}
    </Wrapper>
  );
}

// --- L'étagère : seulement les tranches des boîtiers, comme rangés chez soi ---

const SPINE_COLORS = ["#141414", "#f2ead8", "#1b3a6b", "#8c1c13", "#2f5d50", "#3b2a4a", "#d9c7a0", "#0f0f0f"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function Spine({ film }: { film: CaseFilm }) {
  const s = caseStyle(film.format);
  const bg = film.format?.startsWith("Blu-ray") && film.format !== "Blu-ray 4K" ? "#0a3f8f" : SPINE_COLORS[hash(film.title) % SPINE_COLORS.length];
  const light = ["#f2ead8", "#d9c7a0"].includes(bg);
  const height = s.ratio.startsWith("135 / 171") ? "88%" : s.ratio.startsWith("105") ? "100%" : "97%";
  return (
    <Link
      href={film.href}
      title={`${film.title}${film.year ? ` (${film.year})` : ""}`}
      className="spine group relative flex w-[34px] shrink-0 flex-col items-center justify-between self-end rounded-[3px] py-2 transition duration-300 hover:-translate-y-3 md:w-[40px]"
      style={{ height, background: bg, color: light ? "#141210" : "#f2ead8" }}
    >
      <span className="h-1.5 w-full" style={{ background: s.band, opacity: film.format ? 1 : 0 }} />
      <span className="font-display line-clamp-1 max-h-[70%] text-[13px] leading-none [writing-mode:vertical-rl] md:text-[15px]">{film.title}</span>
      <span className="text-[9px] opacity-70 tabular-nums">{film.year ? `’${String(film.year).slice(2)}` : ""}</span>
      <span className="pointer-events-none absolute inset-0 rounded-[3px] bg-gradient-to-r from-white/15 via-transparent to-black/30" />
    </Link>
  );
}

export function Shelf({ films }: { films: CaseFilm[] }) {
  // Une rangée d'étagère tous les 18 boîtiers environ.
  const rows: CaseFilm[][] = [];
  for (let i = 0; i < films.length; i += 18) rows.push(films.slice(i, i + 18));
  return (
    <div className="space-y-10">
      {rows.map((row, i) => (
        <div key={i} className="relative">
          <div className="no-scrollbar flex h-[230px] items-end gap-[3px] overflow-x-auto px-3 pt-4 md:h-[280px]">
            {row.map((f) => <Spine key={f.id} film={f} />)}
          </div>
          {/* La planche */}
          <div className="h-3 rounded-sm bg-gradient-to-b from-[#7a5a3a] to-[#4a3220] shadow-[0_10px_18px_-6px_#000a]" />
        </div>
      ))}
    </div>
  );
}
