"use client";

import { useState } from "react";
import type { WorldMapData } from "@/lib/world-map";

/*
 * La carte des pays d'origine des films vus : plus un pays est clair, plus j'y ai vu de films.
 * Cinq paliers d'une seule teinte (l'accent du thème), une infobulle au survol ou au toucher,
 * et la liste complète en table pour les lecteurs d'écran.
 */
const BINS = [1, 3, 10, 30, 100];
const STEPS = [30, 45, 61, 79, 100]; // part de la couleur d'accent, du palier le plus bas au plus haut
const fill = (n: number) => {
  if (!n) return "var(--surface-2)";
  let i = 0;
  while (i < BINS.length - 1 && n >= BINS[i + 1]) i++;
  return `color-mix(in oklab, var(--accent) ${STEPS[i]}%, var(--surface-2))`;
};
const legend = BINS.map((b, i) => (i === BINS.length - 1 ? `${b}+` : BINS[i + 1] - 1 === b ? `${b}` : `${b}–${BINS[i + 1] - 1}`));

export function WorldMap({ map }: { map: WorldMapData }) {
  const byKey = new Map(map.data.map((c) => [c.key, c]));
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const cur = tip ? byKey.get(tip.key) : null;

  const show = (key: string | null) => (e: React.PointerEvent<SVGElement>) => {
    if (!key) return setTip(null);
    const box = (e.currentTarget.ownerSVGElement ?? (e.currentTarget as SVGSVGElement)).getBoundingClientRect();
    setTip({ key, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  return (
    <figure className="chart">
      <div className="relative" onPointerLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block h-auto w-full" role="img" aria-label={`Carte des ${map.data.length} pays d'origine des films vus`}>
          <path d={map.outline} fill="none" stroke="var(--dm-line)" strokeWidth={1} />
          {map.shapes.map((s) => (
            <path
              key={s.name}
              d={s.d}
              fill={fill(s.key ? (byKey.get(s.key)?.value ?? 0) : 0)}
              stroke="var(--background)"
              strokeWidth={0.6}
              strokeLinejoin="round"
              className={s.key ? "cursor-pointer transition-opacity hover:opacity-80" : undefined}
              onPointerMove={show(s.key)}
              onPointerDown={show(s.key)}
            />
          ))}
          {map.dots.map((d) => (
            <g key={d.key} onPointerMove={show(d.key)} onPointerDown={show(d.key)} className="cursor-pointer">
              {/* cible plus large que le point, pour le doigt */}
              <circle cx={d.x} cy={d.y} r={9} fill="transparent" />
              <circle cx={d.x} cy={d.y} r={3.5} fill={fill(byKey.get(d.key)?.value ?? 0)} stroke="var(--background)" strokeWidth={1.5} />
            </g>
          ))}
        </svg>
        {cur && tip && (
          <span
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg"
            style={{ left: tip.x, top: tip.y }}
          >
            {cur.label} · <b>{cur.value}</b> film{cur.value > 1 ? "s" : ""}
            {cur.avg != null && ` · ${cur.avg.toFixed(1).replace(".", ",")} ★`}
          </span>
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
        <span>Films vus</span>
        {legend.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--accent) ${STEPS[i]}%, var(--surface-2))` }} />
            <span className="tabular-nums">{l}</span>
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <tbody>
          {[...map.data].sort((a, b) => b.value - a.value).map((c) => (
            <tr key={c.key}>
              <th>{c.label}</th>
              <td>{c.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
