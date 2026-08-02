// Service Worker — Martien Design Order Tracker
// 1) Cache app shell biar bisa dibuka offline
// 2) Terima push notification dari Firebase Cloud Messaging walau app ditutup

const CACHE_NAME = "order-tracker-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase-config.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first + no-store, TAPI cuma untuk file dari web kita sendiri
// (same-origin). Request ke Firebase Auth/Firestore/gstatic (cross-origin)
// dibiarkan lewat apa adanya — kalau ikut di-intercept, bisa mengganggu
// koneksi real-time Firestore (termasuk baca status PIN) dan bikin app
// nyangkut/gagal aneh.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // biarkan browser handle langsung

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---- Firebase Cloud Messaging (background push) ----
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// PENTING: ganti dengan config yang SAMA seperti di js/firebase-config.js
firebase.initializeApp({
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT.firebaseapp.com",
  projectId: "GANTI_PROJECT",
  storageBucket: "GANTI_PROJECT.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || "Cek Order Kamu";
  const options = {
    body: payload.notification?.body || "Sudah waktunya cek status order desain kamu.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png"
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes("index.html") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});
