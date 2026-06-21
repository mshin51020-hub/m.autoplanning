const CACHE_NAME = "m-autoplanning-v1";
const ICON_URL   = "/manus-storage/icon-fist-v4-transparent_856cda0b.png";

// インストール時にアプリシェルをキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/"]))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ネットワーク優先、失敗時はキャッシュにフォールバック
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/"))
  );
});

// プッシュ通知受信
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "M. AutoPlanning";
  const options = {
    body:    data.body  ?? "",
    icon:    ICON_URL,
    badge:   ICON_URL,
    tag:     data.tag   ?? "default",
    renotify: true,
    data:    { url: data.url ?? "/" },
    actions: [
      { action: "open",    title: "トレーニングを開始" },
      { action: "dismiss", title: "後で" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知クリック時にアプリを開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) =>
          c.url.startsWith(self.location.origin)
        );
        if (existing) {
          existing.focus();
          return existing.navigate(targetUrl);
        }
        return clients.openWindow(targetUrl);
      })
  );
});
