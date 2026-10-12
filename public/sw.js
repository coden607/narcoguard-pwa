const CACHE_NAME = "narcoguard-shell-v6";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/safer-use",
  "/help",
  "/ar",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/icon-maskable-512.png",
  "/images/narcoguard-icon-256.jpeg",
  "/images/narcoguard-logo-96.webp",
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
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

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
