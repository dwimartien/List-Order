// Service Worker — Martien Design Order Tracker
// HANYA untuk 1 hal: terima push notification reminder walau app ditutup.
// TIDAK ikut campur di request/fetch apa pun lagi (biar gak pernah lagi
// bentrok sama koneksi real-time Firestore/Auth).

const CACHE_NAME = "order-tracker-v6";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  // Bersihkan cache lama dari versi-versi sebelumnya (v1-v5) yang mungkin
  // masih nyangkut di browser
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// ---- Firebase Cloud Messaging (background push) ----
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// PENTING: ganti dengan config yang SAMA seperti di js/firebase-config.js
firebase.initializeApp({
 apiKey: "AIzaSyB5hUkh-CXVBwI1dz0z7M6ykFaFfdonxjo",
  authDomain: "list-order-e2969.firebaseapp.com",
  projectId: "list-order-e2969",
  storageBucket: "list-order-e2969.firebasestorage.app",
  messagingSenderId: "481906633016",
  appId: "1:481906633016:web:290ffbbd5e2beb0a3db9cd",
  measurementId: "G-RE0JCQK537"
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
