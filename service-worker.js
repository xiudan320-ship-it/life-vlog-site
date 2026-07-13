const CACHE_NAME = "life-vlog-site-20260713-163-pwa";
const APP_MEDIA_CACHES = new Set([
  "life-vlog-diary-media-cache",
  "life-vlog-secret-media-cache",
]);
const CORE_ASSETS = [
  "./",
  "./styles.css?v=20260610-37",
  "./redesign.css?v=20260713-163",
  "./app.js?v=20260713-163",
  "./manifest.webmanifest",
  "./assets/food-wheel-icon.png",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/home-logo.jpg",
  "./assets/black-cat-cover.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // One optional asset must not prevent the whole offline shell from
        // installing. The root document is the canonical navigation fallback.
        await Promise.allSettled(
          CORE_ASSETS.map(async (asset) => {
            const response = await fetch(asset, { cache: "reload" });
            if (!response.ok) throw new Error(`Unable to cache ${asset}`);
            await cache.put(asset, response);
          })
        );
        const root = await cache.match("./");
        if (!root) throw new Error("Offline app shell was not cached");
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && !APP_MEDIA_CACHES.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isImageRequest = request.destination === "image";
  // R2 media is written into the capacity-managed diary/secret caches by
  // app.js. Serve those entries offline, but never add viewed images here.
  if (!isSameOrigin && isImageRequest) {
    event.respondWith(
      caches.match(request, { ignoreVary: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request);
      })
    );
    return;
  }
  if (!isSameOrigin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./", copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || (await caches.match("./"));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok || response.type === "opaque") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
