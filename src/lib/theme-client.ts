import { THEMES, type Theme } from "./theme";

// Change le thème tout de suite (sans recharger), et le garde dans un cookie (1 an).
export function applyTheme(t: Theme) {
  const root = document.documentElement;
  const swap = () => {
    root.dataset.theme = t;
    // Barre d'état d'Android et barre de titre de l'appli installée aux couleurs du thème
    const bg = THEMES.find((x) => x.key === t)!.bar;
    document.querySelectorAll("meta[name=theme-color]").forEach((m) => m.setAttribute("content", bg));
  };
  document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
  // Un fondu enchaîné entre les deux thèmes, quand le navigateur sait le faire
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(swap);
  else swap();
}
