const CACHE_NAME = "nws-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/icons/wildlife.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("nws-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("/index.html")) || Response.error()));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
});

self.addEventListener("push", (event) => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch { message = {}; }
  const title = String(message.title || "Wildlife field update").slice(0, 100);
  const body = String(message.body || "Open the app for details.").slice(0, 240);
  const path = typeof message.url === "string" && message.url.startsWith("/") && !message.url.startsWith("//")
    ? message.url : "/notifications";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icons/wildlife.svg",
    badge: "/icons/wildlife.svg",
    tag: String(message.tag || "wildlife-update").slice(0, 100),
    data: { path },
    renotify: false,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path;
  const target = new URL(typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    return existing ? existing.navigate(target).then(() => existing.focus()) : self.clients.openWindow(target);
  }));
});
