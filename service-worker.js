const CACHE_NAME = "life-vlog-site-20260824-030-pwa";
const APP_MEDIA_CACHES = new Set([
  "life-vlog-diary-image-cache",
  "life-vlog-secret-media-cache",
]);
const CORE_ASSETS = [
  "./",
  "./styles.css?v=20260824-026",
  "./redesign.css?v=20260824-027",
  "./weekend-board.css?v=20260823-241",
  "./assets/weekend-complete-stamp.png",
  "./diary-detail.css?v=20260823-019",
  "./secret-viewer.css?v=20260814-231",
  "./wardrobe.css?v=20260811-007",
  "./app.js?v=20260824-030",
  "./modules/admin-storage.js",
  "./modules/app-elements.js",
  "./modules/auth-controller.js",
  "./modules/asset-controller.js",
  "./modules/account-view.js",
  "./modules/account-sync-domain.js",
  "./modules/anniversary-controller.js",
  "./modules/anniversary-view.js",
  "./modules/vlog-mode.js",
  "./modules/weekend-gallery.js?v=20260824-030",
  "./modules/app-lifecycle.js",
  "./modules/confirm-dialog.js",
  "./modules/cache-policy.js",
  "./modules/cache-management-view.js",
  "./modules/cloud-models.js",
  "./modules/cloudflare-client.js?v=20260811-010",
  "./modules/data-repositories.js?v=20260814-008",
  "./modules/diary-domain.js",
  "./modules/diary-gallery-view.js",
  "./modules/diary-upload-domain.js",
  "./modules/diary-video-layout.js?v=20260824-030",
  "./modules/food-wheel-view.js",
  "./modules/food-wheel-controller.js",
  "./modules/gamification-controller.js",
  "./modules/family-activity-view.js",
  "./modules/gamification-archive.js",
  "./modules/gamification-domain.js?v=20260810-003",
  "./modules/gamification-view.js",
  "./modules/gratitude-view.js",
  "./modules/gratitude-controller.js",
  "./modules/household-repository.js",
  "./modules/image-service.js",
  "./modules/media-cache.js",
  "./modules/media-gesture-domain.js",
  "./modules/media-metadata.js",
  "./modules/mobile-diary-view.js?v=20260824-030",
  "./modules/notification-domain.js",
  "./modules/notification-view.js",
  "./modules/offline-cache-controller.js",
  "./modules/offline-settings-controller.js",
  "./modules/data-safety-controller.js",
  "./modules/account-sync-controller.js",
  "./modules/trash-controller.js",
  "./modules/diary-feed-controller.js?v=20260824-028",
  "./modules/social-controller.js",
  "./modules/family-settings-controller.js",
  "./modules/family-activity-controller.js",
  "./modules/tool-dock-controller.js",
  "./modules/layout-settings-controller.js",
  "./modules/app-event-bindings.js",
  "./modules/profile-preferences-controller.js",
  "./modules/offline-records.js",
  "./modules/photo-favorites.js",
  "./modules/photo-dialog-view.js",
  "./modules/photo-viewer-controller.js?v=20260824-030",
  "./modules/photo-detail-controller.js?v=20260824-030",
  "./modules/preferences-store.js",
  "./modules/push-controller.js",
  "./modules/recipe-controller.js",
  "./modules/recipe-view.js",
  "./modules/secret-domain.js?v=20260810-004",
  "./modules/secret-controller.js",
  "./modules/secret-pin-controller.js",
  "./modules/secret-gallery-view.js",
  "./modules/ui-formatters.js",
  "./modules/upload-queue.js",
  "./modules/wardrobe.js?v=20260811-005",
  "./modules/weekend-controller.js?v=20260824-030",
  "./modules/diary-composer-controller.js",
  "./modules/wishlist-view.js",
  "./modules/wishlist-controller.js",
  "./modules/weekend-plans-view.js?v=20260824-030",
  "./modules/vip-center.js",
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
        // Install atomically. Keeping the previous worker is safer than
        // activating a new offline shell with a missing module or stylesheet.
        await Promise.all(
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
        .then(async (response) => {
          const copy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./", copy);
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || (await caches.match("./"));
        })
    );
    return;
  }

  if (request.destination === "script") {
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then(async (response) => {
          if (response.ok || response.type === "opaque") {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  const network = fetch(request).then(async (response) => {
    if (response.ok || response.type === "opaque") {
      const copy = response.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, copy);
    }
    return response;
  });
  event.waitUntil(network.then(() => undefined, () => undefined));
  event.respondWith(
    caches.match(request).then((cached) => cached || network)
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { title: "咻蛋之家", body: event.data?.text() || "家里有新动态" };
  }
  const title = payload.title || "咻蛋之家";
  const options = {
    body: payload.body || "家里有新动态",
    icon: payload.icon || "./assets/app-icon-192.png",
    badge: payload.badge || "./assets/app-icon-192.png",
    tag: payload.tag || "life-vlog-update",
    renotify: true,
    data: payload,
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    if (self.registration.setAppBadge && Number(payload.unread) > 0) {
      await self.registration.setAppBadge(Number(payload.unread)).catch(() => {});
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "./", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: "OPEN_PUSH_NOTIFICATION", data });
      return;
    }
    await self.clients.openWindow(targetUrl);
  })());
});
