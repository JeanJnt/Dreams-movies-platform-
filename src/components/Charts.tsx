// Petits graphiques en HTML/CSS, aux couleurs du thème (une seule série → la couleur d'accent).
// Chaque barre a une infobulle au survol, et une table cachée pour les lecteurs d'écran.

export type Datum = { key: string; label: string; tick?: string; value: number; avg?: number | null };

// Colonnes verticales (évolution dans le temps, distribution).
export function Columns({ data, unit = "films", highlight, labelEvery = 1, height = 180 }: { data: Datum[]; unit?: string; highlight?: string; labelEvery?: number; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <figure>
      <div className="relative flex items-end gap-[2px]" style={{ height }}>
        {/* Lignes de repère discrètes */}
        {[0.5, 1].map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${t * 100}%` }}>
            <span className="absolute -top-2.5 right-0 bg-background px-1 text-[10px] text-muted tabular-nums">{Math.round(max * t)}</span>
          </div>
        ))}
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-[4px] transition-opacity group-hover:opacity-100 ${d.key === highlight ? "bg-accent" : "bg-accent/70"} ${d.value ? "" : "opacity-0"}`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }}
            />
            {d.key === peak.key && d.value > 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-medium tabular-nums" style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}>{d.value}</span>
            )}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg group-hover:block">
              {d.label} · <b>{d.value}</b> {unit}
              {d.avg != null && ` · ${d.avg}★`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] border-t border-border pt-1.5">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center text-[10px] text-muted">{i % labelEvery === 0 ? (d.tick ?? d.label) : ""}</span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>{data.map((d) => <tr key={d.key}><th>{d.label}</th><td>{d.value}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

// Barres horizontales (classements : genres, pays…).
export function Bars({ data, unit = "films" }: { data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.key} className="group grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={`${d.label} : ${d.value} ${unit}${d.avg != null ? `, moyenne ${d.avg}★` : ""}`}>
          <span className="truncate">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-accent/80 transition-colors group-hover:bg-accent" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="w-16 text-right text-xs text-muted tabular-nums">
            {d.value}
            {d.avg != null && <span className="ml-1.5 opacity-70">{d.avg.toFixed(1)}★</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
