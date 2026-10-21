// Chaque thème est inspiré d'un film : couleurs, typographie et petit motif sous les titres.
export const THEMES = [
  { key: "yume", label: "夢 Yume", film: "Rêves — « Les Corbeaux »", director: "Akira Kurosawa", year: 1990, swatch: ["#14246b", "#f2c230", "#0b0b0b"] },
  { key: "totoro", label: "トトロ", film: "Mon voisin Totoro", director: "Hayao Miyazaki", year: 1988, swatch: ["#cfe6f2", "#3f7d4e", "#e86a3a"] },
  { key: "lynch", label: "Twin Peaks", film: "Twin Peaks : Fire Walk with Me", director: "David Lynch", year: 1992, swatch: ["#5c0a0e", "#f1ece1", "#0b0b0b"] },
  { key: "pierrot", label: "Pierrot", film: "Pierrot le fou", director: "Jean-Luc Godard", year: 1965, swatch: ["#ff4a1c", "#1838ff", "#111111"] },
  { key: "mood", label: "花樣年華", film: "In the Mood for Love", director: "Wong Kar-wai", year: 2000, swatch: ["#2a0a0e", "#e0a84e", "#f3e3cf"] },
  { key: "odyssey", label: "2001", film: "2001 : l'Odyssée de l'espace", director: "Stanley Kubrick", year: 1968, swatch: ["#f3f3f1", "#e10600", "#0b0b0b"] },
  { key: "closeup", label: "Close-Up", film: "Close-Up", director: "Abbas Kiarostami", year: 1990, swatch: ["#eee6d8", "#a4532a", "#6b7440"] },
] as const;

export type Theme = (typeof THEMES)[number]["key"];
