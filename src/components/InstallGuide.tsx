"use client";

import { useEffect, useState } from "react";

type Platform = "iphone" | "android" | "mac" | "windows";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "iphone", label: "iPhone / iPad" },
  { key: "android", label: "Android" },
  { key: "windows", label: "Windows" },
  { key: "mac", label: "Mac" },
];

const STEPS: Record<Platform, { title: string; steps: string[]; note?: string }> = {
  iphone: {
    title: "Sur iPhone et iPad (Safari)",
    steps: [
      "Ouvre Dreams dans Safari.",
      "Touche le bouton Partager (le carré avec une flèche vers le haut), en bas de l'écran.",
      "Fais défiler et choisis « Sur l'écran d'accueil ».",
      "Touche « Ajouter » : l'icône 夢 apparaît à côté de tes autres applis.",
    ],
    note: "Dreams s'ouvre alors en plein écran, sans la barre de Safari, comme une vraie appli.",
  },
  android: {
    title: "Sur Android (Chrome)",
    steps: [
      "Ouvre Dreams dans Chrome.",
      "Touche « Installer l'appli » ci-dessous, ou le menu ⋮ puis « Installer l'application ».",
      "Confirme : Dreams s'ajoute à ton écran d'accueil et à la liste de tes applis.",
    ],
    note: "Appui long sur l'icône : raccourcis vers Conseils, Scanner, Agenda et Au cinéma.",
  },
  windows: {
    title: "Sur Windows (Chrome ou Edge)",
    steps: [
      "Ouvre Dreams dans Chrome ou Edge.",
      "Clique sur « Installer l'appli » ci-dessous, ou sur l'icône d'installation à droite de la barre d'adresse.",
      "Dreams s'ouvre dans sa propre fenêtre et apparaît dans le menu Démarrer : tu peux l'épingler à la barre des tâches.",
    ],
    note: "Astuce : touche « / » pour chercher un film depuis n'importe quelle page.",
  },
  mac: {
    title: "Sur Mac",
    steps: [
      "Avec Safari : menu Fichier → « Ajouter au Dock ».",
      "Avec Chrome : clique sur « Installer l'appli » ci-dessous, ou sur l'icône d'installation dans la barre d'adresse.",
      "Dreams s'ouvre dans sa propre fenêtre, avec son icône dans le Dock et le Launchpad.",
    ],
    note: "Astuce : touche « / » pour chercher un film depuis n'importe quelle page.",
  },
};

function detect(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  if (/Mac/.test(ua)) return "mac";
  return "windows";
}

export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>("windows");
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detect());
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    // Chrome et Edge (Android, Windows, Mac) proposent une vraie boîte d'installation
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const guide = STEPS[platform];

  return (
    <div className="space-y-6">
      {installed && (
        <div className="rounded-2xl border border-accent bg-accent-soft p-4 text-accent">✓ Dreams est déjà installé sur cet appareil.</div>
      )}

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={`rounded-full border px-4 py-2 text-sm transition ${platform === p.key ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-muted hover:text-foreground"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-xl md:text-2xl">{guide.title}</h2>
        <ol className="mt-5 space-y-4">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">{i + 1}</span>
              <span className="pt-1.5 leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
        {prompt && platform !== "iphone" && !installed && (
          <button
            onClick={async () => {
              await prompt.prompt();
              if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
              setPrompt(null);
            }}
            className="font-display mt-6 rounded-full bg-accent px-6 py-3 text-on-accent"
          >
            ⬇ Installer l&apos;appli
          </button>
        )}
        {guide.note && <p className="mt-5 text-sm text-muted">{guide.note}</p>}
      </section>

      <p className="text-sm text-muted">
        Pour installer Dreams sur ton téléphone, l&apos;appli doit d&apos;abord être en ligne (une adresse en https). Sur cet ordinateur, elle s&apos;installe déjà depuis Chrome ou Edge.
      </p>
    </div>
  );
}
