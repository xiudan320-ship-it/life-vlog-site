import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(({ request }) => request.mode === "navigate", new NetworkFirst({
  cacheName: "life-vlog-navigation",
  networkTimeoutSeconds: 3,
}));
registerRoute(({ request, url }) => request.destination === "script" || request.destination === "style" || url.pathname.includes("/assets/"), new CacheFirst({
  cacheName: "life-vlog-static-runtime",
  plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 31536000 })],
}));
registerRoute(({ request }) => request.destination === "image" && request.url.startsWith(self.location.origin), new StaleWhileRevalidate({
  cacheName: "life-vlog-ui-images",
  plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 2592000 })],
}));

self.addEventListener("install", () => {});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = { title: "咻蛋之家", body: event.data?.text() || "家里有新动态" }; }
  const title = payload.title || "咻蛋之家";
  const options = { body: payload.body || "家里有新动态", icon: payload.icon || "/assets/generated/app-icon-192.png", badge: payload.badge || "/assets/generated/app-icon-192.png", tag: payload.tag || "life-vlog-update", renotify: true, data: payload };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    if (self.registration.setAppBadge && Number(payload.unread) > 0) await self.registration.setAppBadge(Number(payload.unread)).catch(() => {});
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.focus(); existing.postMessage({ type: "OPEN_PUSH_NOTIFICATION", data }); return; }
    await self.clients.openWindow(targetUrl);
  })());
});
