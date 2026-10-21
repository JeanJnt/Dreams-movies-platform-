const parse = (iso: string) => new Date(`${iso}T12:00:00`);

export const formatShortDate = (iso: string | null) =>
  iso ? parse(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

export const formatLongDate = (iso: string | null) =>
  iso ? parse(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

export const formatRuntime = (minutes: number | null) =>
  minutes ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}` : null;
