const CACHE_NAME = "narcoguard-shell-v19";
// Offline map tiles (Feature 60) live in a separate cache that the page fills only after the
// person opts in. The worker never fetches or intercepts any third-party tile request; it just
// keeps that cache when old shell caches are cleaned up.
const TILE_CACHE_NAME = "narcoguard-map-tiles-v1";
// Hashed build files (/_next/static/) never change once published. They live in their own cache
// that survives shell version bumps, so a tab or installed app still running the previous build
// can finish loading its chunks after a new deployment no longer serves them.
const STATIC_CACHE_NAME = "narcoguard-next-static-v1";
const STATIC_CACHE_MAX = 400;
const APP_SHELL = [
  "/images/ng-titanium-3d.png?rev=complete-2026-10-15",
  "/",
  "/offline.html",
  "/safer-use",
  "/help",
  "/watch",
  "/fund",
  "/ar",
  "/check-on-me",
  "/naloxone-card",
  "/aftercare",
  "/rescue-breathing",
  "/wound-care",
  "/bystander",
  "/911-script",
  "/bystander-qr.svg",
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
  "/images/ng-rev5-hero-titanium.jpg?rev=titanium-solar-2026-11-18",
  "/images/ng-rev5-exploded-titanium.jpg?rev=titanium-solar-2026-11-18",
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
            .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE_NAME && key !== STATIC_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => trimStaticCache())
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/api/")) return;

  if (requestUrl.pathname.startsWith("/_next/static/")) {
    event.respondWith(staticAsset(event.request));
    return;
  }

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

async function staticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function trimStaticCache() {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const keys = await cache.keys();
  const excess = keys.length - STATIC_CACHE_MAX;
  if (excess > 0) await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
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
