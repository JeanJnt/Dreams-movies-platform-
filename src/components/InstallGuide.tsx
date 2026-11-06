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
      "Ouvrez Dreams dans Safari.",
      "Touchez le bouton Partager (le carré avec une flèche vers le haut), en bas de l'écran.",
      "Faites défiler et choisissez « Sur l'écran d'accueil ».",
      "Touchez « Ajouter » : l'icône de Dreams apparaît à côté de vos autres applications.",
    ],
    note: "Dreams s'ouvre alors en plein écran, sans la barre de Safari, comme une application.",
  },
  android: {
    title: "Sur Android (Chrome)",
    steps: [
      "Ouvrez Dreams dans Chrome.",
      "Touchez « Installer l'application » ci-dessous, ou le menu ⋮ puis « Installer l'application ».",
      "Confirmez : Dreams s'ajoute à votre écran d'accueil et à vos applications.",
    ],
    note: "Appui long sur l'icône : raccourcis vers Recommandations, Scanner, Agenda et À l'affiche.",
  },
  windows: {
    title: "Sur Windows (Chrome ou Edge)",
    steps: [
      "Ouvrez Dreams dans Chrome ou Edge.",
      "Cliquez sur « Installer l'application » ci-dessous, ou sur l'icône d'installation à droite de la barre d'adresse.",
      "Dreams s'ouvre dans sa propre fenêtre et apparaît dans le menu Démarrer : vous pouvez l'épingler à la barre des tâches.",
    ],
    note: "Raccourci : appuyez sur « / » ou Ctrl K pour rechercher un film depuis n'importe quelle page.",
  },
  mac: {
    title: "Sur Mac",
    steps: [
      "Avec Safari : menu Fichier → « Ajouter au Dock ».",
      "Avec Chrome : cliquez sur « Installer l'application » ci-dessous, ou sur l'icône d'installation dans la barre d'adresse.",
      "Dreams s'ouvre dans sa propre fenêtre, avec son icône dans le Dock et le Launchpad.",
    ],
    note: "Raccourci : appuyez sur « / » ou ⌘ K pour rechercher un film depuis n'importe quelle page.",
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

      <section className="card rounded-3xl p-6">
        <h2 className="font-display text-[1.7rem] leading-[1.1] md:text-[2.2rem]">{guide.title}</h2>
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
            className="btn btn-primary mt-6 h-12 px-6"
          >
            Installer l&apos;application
          </button>
        )}
        {guide.note && <p className="mt-5 text-sm text-muted">{guide.note}</p>}
      </section>

    </div>
  );
}
