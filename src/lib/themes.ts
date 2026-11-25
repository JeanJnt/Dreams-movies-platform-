/*
 * Les thèmes de Dreams : « Noir et blanc » (argent, par défaut), « Noir et rouge » et « Noir et lilas ».
 * Seules la couleur d'action, les repères et la matière du logo changent (voir globals.css, html[data-theme=…]).
 * Le choix est gardé dans le cookie dm-theme, lu par le serveur : la page s'affiche directement dans le bon thème.
 * Commun au serveur et au navigateur.
 */
export const THEMES = [
  { key: "argent", label: "Noir et blanc", short: "Blanc", swatch: "linear-gradient(135deg,#000 50%,#ecebe7 50%)" },
  { key: "rouge", label: "Noir et rouge", short: "Rouge", swatch: "linear-gradient(135deg,#000 50%,#ff1f2e 50%)" },
  { key: "lilas", label: "Noir et lilas", short: "Lilas", swatch: "linear-gradient(135deg,#000 50%,#c9a8ff 50%)" },
] as const;
export type ThemeKey = (typeof THEMES)[number]["key"];

export const themeFrom = (value: string | undefined): ThemeKey => THEMES.find((t) => t.key === value)?.key ?? "argent";

// L'attribut data-theme de la page : absent pour le thème par défaut
export const themeAttr = (t: ThemeKey) => (t === "argent" ? undefined : t);

// Suffixe des fichiers d'icône (public/icon-192-rouge.png…) : rien pour l'argent
export const iconSuffix = (t: ThemeKey) => (t === "argent" ? "" : `-${t}`);

/*
 * L'icône de l'appli (onglet, écran d'accueil, Dock, Android) : par défaut elle suit le thème, mais on peut en choisir une
 * autre dans les réglages. Gardée dans le cookie dm-icon. Chaque logo a ses fichiers dans public/ (scripts/make-icons.mjs).
 */
export const APP_ICONS = [
  { key: "argent", label: "Argent" },
  { key: "rouge", label: "Rouge" },
  { key: "lilas", label: "Lilas" },
] as const;
export type AppIconKey = (typeof APP_ICONS)[number]["key"];
export type IconChoice = AppIconKey | "auto";

export const iconChoiceFrom = (value: string | undefined): IconChoice => APP_ICONS.find((i) => i.key === value)?.key ?? "auto";

// Le suffixe des fichiers de l'icône à montrer, d'après le thème et le choix d'icône
export const appIconSuffix = (theme: ThemeKey, choice: IconChoice) => (choice === "auto" ? iconSuffix(theme) : choice === "argent" ? "" : `-${choice}`);
