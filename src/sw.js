// Service worker di Musicly: l'interfaccia funziona offline.
// Gli audio NON vengono messi in cache (file grandi e richieste a intervalli).
const CACHE = "musicly-v1";

const SHELL = [
  "./",
  "index.html",
  "style.css",
  "lib.js",
  "tracks.js",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET della nostra origine: audio e altro vanno direttamente in rete.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("index.html"));
      // stale-while-revalidate: risposta subito dalla cache, aggiornata in background
      return cached || network;
    })
  );
});
