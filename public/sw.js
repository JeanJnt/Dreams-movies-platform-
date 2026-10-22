// Service worker de Dreams : l'appli se lance même sans réseau (dernières pages vues + page hors ligne).
const VERSION = "dreams-v3";
const OFFLINE = "/hors-ligne";
const PRECACHE = [OFFLINE, "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages : réseau d'abord, sinon la dernière version gardée, sinon la page hors ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE))),
    );
    return;
  }

  // Fichiers de l'appli (JS, CSS, polices) et affiches TMDB : le cache d'abord, c'est plus rapide.
  if (url.pathname.startsWith("/_next/static/") || url.hostname === "image.tmdb.org") {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === "opaque") {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

// Notifications (Web Push) : affichage, puis ouverture de la bonne page quand on touche la notification.
self.addEventListener("push", (event) => {
  let data = { title: "Dreams", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // message vide ou illisible : notification par défaut
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      // Rappel de séance : reste affiché jusqu'à ce qu'on le ferme
      requireInteraction: Boolean(data.persistent),
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  // Lien externe (réservation) : on l'ouvre dans le navigateur
  if (!url.startsWith(self.location.origin)) {
    event.waitUntil(self.clients.openWindow(url));
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((c) => c && c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
