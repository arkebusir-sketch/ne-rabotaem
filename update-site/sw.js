/* Перерыв: сервис-воркер. Нужен для установки на экран «Домой», работы без сети (оболочка)
   и уведомлений. Данные чата сюда не попадают: база Firebase всегда идёт напрямую. */
const CACHE = "pereryv-v8";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Страницы сайта: сначала сеть (чтобы обновления доходили сразу), без сети — копия из кэша
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { if (res.ok && u.pathname === "/") { const cp = res.clone(); caches.open(CACHE).then((c) => c.put("/", cp)); } return res; }).catch(() => caches.match("/")));
    return;
  }
  if (/\.(png|webmanifest)$/.test(u.pathname)) e.respondWith(caches.match(r).then((hit) => hit || fetch(r)));
});

// Нажатие на уведомление: открыть чат
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const rid = (e.notification.data || {}).rid;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => "focus" in x);
    if (c) { c.postMessage({ t: "open", rid }); return c.focus(); }
    return self.clients.openWindow("/" + (rid ? "#" + rid : ""));
  }));
});

// Заготовка под настоящие пуши с сервера (когда он появится)
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) {}
  e.waitUntil(self.registration.showNotification(d.title || "Перерыв", { body: d.body || "", tag: d.rid || "msg", icon: "/icon-192.png", badge: "/icon-192.png", data: { rid: d.rid } }));
});
