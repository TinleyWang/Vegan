/* 全素成分檢查 — 離線快取
   改版時把 VERSION 加一，使用者下次連網開啟會自動更新。 */
const VERSION = "v1";
const CACHE = "vegan-check-" + VERSION;
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable.png", "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;

  // 導覽請求（含 ?q=… ）一律回同一份頁面，離線也開得起來
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put("./index.html", r.clone())); return r; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // 其餘資源：先給快取，同時在背景更新
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(r => { if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
