// Chaque thème est inspiré d'un film : couleurs, typographie et petit motif sous les titres.
// bar : couleur de la barre de titre de l'appli installée (et de la barre d'état sur Android).
export const THEMES = [
  { key: "lynch", bar: "#3a0306", label: "Twin Peaks", film: "Twin Peaks", director: "David Lynch", year: 1992, swatch: ["#5c0a0e", "#f1ece1", "#0b0b0b"] },
  { key: "pierrot", bar: "#ff4a1c", label: "Pierrot le fou", film: "Pierrot le fou", director: "Jean-Luc Godard", year: 1965, swatch: ["#ff4a1c", "#1838ff", "#111111"] },
  { key: "yume", bar: "#101c55", label: "Rêves", film: "Rêves", director: "Akira Kurosawa", year: 1990, swatch: ["#14246b", "#f2c230", "#0b0b0b"] },
  { key: "mood", bar: "#3a0810", label: "In the Mood for Love", film: "In the Mood for Love", director: "Wong Kar-wai", year: 2000, swatch: ["#7a1620", "#e0a84e", "#1d3b34"] },
  { key: "vent", bar: "#4f9fd9", label: "Le vent se lève", film: "Le vent se lève", director: "Hayao Miyazaki", year: 2013, swatch: ["#4f9fd9", "#fffdf6", "#3f7d3a"] },
  { key: "odyssey", bar: "#ffffff", label: "2001", film: "2001, l'odyssée de l'espace", director: "Stanley Kubrick", year: 1968, swatch: ["#ffffff", "#e10600", "#050505"] },
  { key: "closeup", bar: "#ece5d6", label: "Close-Up", film: "Close-Up", director: "Abbas Kiarostami", year: 1990, swatch: ["#ece5d6", "#c8161d", "#141210"] },
  { key: "varda", bar: "#ffd53d", label: "Le Bonheur", film: "Le Bonheur", director: "Agnès Varda", year: 1965, swatch: ["#ffd53d", "#6c2bb5", "#ff4f1f"] },
] as const;

export type Theme = (typeof THEMES)[number]["key"];
