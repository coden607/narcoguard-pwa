const CACHE_NAME = "narcoguard-shell-v14";
// Offline map tiles (Feature 60): a bounded, separate cache for the saved map region.
// Only https://tile.openstreetmap.org/{z}/{x}/{y}.png GET requests ever enter it.
const TILE_CACHE_NAME = "narcoguard-map-tiles-v1";
const TILE_CACHE_MAX = 48;
const TILE_ORIGIN = "https://tile.openstreetmap.org";
const APP_SHELL = [
  "/images/ng-titanium-3d.png?rev=complete-2026-10-15",
  "/",
  "/offline.html",
  "/safer-use",
  "/help",
  "/watch",
  "/fund",
  "/ar",
  "/manifest.webmanifest",
  "/icon-192.png?v=9",
  "/icon-512.png?v=9",
  "/apple-touch-icon.png",
  "/icon-maskable-512.png?v=9",
  "/images/narcoguard-icon-256.jpeg",
  "/images/narcoguard-logo-96.webp",
  "/images/ng46-rev5-blueprint.svg",
  "/images/ng40-rev5-blueprint.svg",
  "/images/ng46-rev5-blueprint.svg?rev=5-2026-10-14",
  "/images/ng40-rev5-blueprint.svg?rev=5-2026-10-14",
  "/images/ng-blueprint-detailed.jpg?rev=visual-2026-10-14",
  "/images/ng-exploded-view.jpg?rev=visual-2026-10-14",
  "/images/ng-modular-exploded.jpg?rev=visual-2026-10-14",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_SHELL.map((asset) => cache.add(asset).catch(() => undefined)) ))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Map tiles: cache-first within a hard cap so a saved region stays bounded on device.
  // This branch runs only for the tile host; every other request keeps the behavior below.
  if (requestUrl.origin === TILE_ORIGIN && /^\/\d+\/\d+\/\d+\.png$/.test(requestUrl.pathname)) {
    event.respondWith(serveTile(event.request));
    return;
  }

  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/api/")) return;

  const isNavigation = event.request.mode === "navigate";

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (isNavigation) return caches.match("/offline.html");
        return Response.error();
      })
  );
});


async function serveTile(request) {
  const cached = await caches.match(request, { cacheName: TILE_CACHE_NAME });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(TILE_CACHE_NAME);
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      for (let index = 0; index < keys.length - TILE_CACHE_MAX; index += 1) {
        await cache.delete(keys[index]);
      }
    }
    return response;
  } catch {
    const offline = await caches.match(request, { cacheName: TILE_CACHE_NAME });
    if (offline) return offline;
    return new Response(null, { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("NarcoGuard update", {
      body: "A nearby help request, resource match, or community update may be available. Open NarcoGuard to review it.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "narcoguard-update",
      renotify: true,
      data: { url: "/help" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/hero-signup";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
