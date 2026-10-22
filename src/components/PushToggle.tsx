"use client";

import { useEffect, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// Clé VAPID (base64 URL) → octets, comme l'attend le navigateur.
function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied";

// Activer les notifications sur cet appareil. Sur iPhone, il faut d'abord installer Dreams sur l'écran d'accueil.
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !KEY) return setState(ios && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const current = await reg.pushManager.getSubscription();
      if (current) {
        await fetch("/api/push", { method: "DELETE", body: JSON.stringify({ endpoint: current.endpoint }) });
        await current.unsubscribe();
        setState("off");
      } else {
        if ((await Notification.requestPermission()) !== "granted") return setState("denied");
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) });
        await fetch("/api/push", { method: "POST", body: JSON.stringify(sub) });
        setState("on");
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading") return null;
  if (state === "unsupported") return <p className="text-xs text-muted">Les notifications ne sont pas disponibles dans ce navigateur.</p>;
  if (state === "ios-install") return <p className="text-xs text-muted">Sur iPhone, installe d&apos;abord Dreams sur l&apos;écran d&apos;accueil (Partager → « Sur l&apos;écran d&apos;accueil ») pour recevoir les notifications.</p>;
  if (state === "denied") return <p className="text-xs text-muted">Notifications bloquées : autorise-les pour Dreams dans les réglages de ton appareil.</p>;
  return (
    <button onClick={toggle} disabled={busy} className={`rounded-full px-4 py-2 text-sm ${state === "on" ? "border border-border text-muted" : "bg-accent text-on-accent"}`}>
      {state === "on" ? "Notifications activées · désactiver" : "Activer les notifications"}
    </button>
  );
}
