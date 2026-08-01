// =====================================================================
// GANTI SEMUA NILAI DI BAWAH INI dengan config dari project Firebase kamu
// Firebase Console -> Project Settings -> General -> "Your apps" -> Web app
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyB5hUkh-CXVBwI1dz0z7M6ykFaFfdonxjo",
  authDomain: "list-order-e2969.firebaseapp.com",
  projectId: "list-order-e2969",
  storageBucket: "list-order-e2969.firebasestorage.app",
  messagingSenderId: "481906633016",
  appId: "1:481906633016:web:290ffbbd5e2beb0a3db9cd",
  measurementId: "G-RE0JCQK537"
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
