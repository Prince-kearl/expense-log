// Deliberately minimal: this app shows live financial data, so the only
// thing this service worker caches is the static app shell needed for
// installability and an offline fallback page. It never caches JS/CSS
// bundles, API responses, or server-function calls — those always hit the
// network so a signed-out session or stale expense data is never served
// from cache.
const SHELL_CACHE = "cointrail-shell-v1";
const SHELL_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // let every other request pass through untouched

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html").then((cached) => cached ?? Response.error())),
  );
});
