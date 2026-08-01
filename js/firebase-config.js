// =====================================================================
// GANTI SEMUA NILAI DI BAWAH INI dengan config dari project Firebase kamu
// Firebase Console -> Project Settings -> General -> "Your apps" -> Web app
// =====================================================================
const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT.firebaseapp.com",
  projectId: "GANTI_PROJECT",
  storageBucket: "GANTI_PROJECT.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

// VAPID key untuk web push notification.
// Ambil di: Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates -> Generate key pair
const VAPID_KEY = "GANTI_VAPID_KEY";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let messaging = null;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
  }
} catch (e) {
  console.warn("Messaging tidak didukung di browser ini:", e);
}
