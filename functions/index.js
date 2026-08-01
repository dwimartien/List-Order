const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Jalan tiap 15 menit, cek apakah sudah waktunya kirim reminder
 * berdasarkan reminderIntervalHours yang diset user di app.
 * Kalau sudah lewat interval-nya, kirim push notification via FCM
 * lalu update lastReminderAt.
 */
exports.checkReminder = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async () => {
    const settingsRef = db.collection("meta").doc("settings");
    const doc = await settingsRef.get();
    if (!doc.exists) return null;

    const data = doc.data();
    const { reminderIntervalHours, lastReminderAt, fcmToken } = data;

    if (!reminderIntervalHours || !fcmToken) return null;

    const now = admin.firestore.Timestamp.now();
    const lastMs = lastReminderAt ? lastReminderAt.toMillis() : 0;
    const elapsedHours = (now.toMillis() - lastMs) / (1000 * 60 * 60);

    if (elapsedHours < reminderIntervalHours) return null;

    // Hitung jumlah order aktif biar notifnya informatif
    const activeSnap = await db.collection("orders")
      .where("status", "in", ["belum", "revisi"])
      .get();
    const belum = activeSnap.docs.filter(d => d.data().status === "belum").length;
    const revisi = activeSnap.docs.filter(d => d.data().status === "revisi").length;

    const message = {
      token: fcmToken,
      notification: {
        title: "Waktunya cek order 👀",
        body: `${belum} order belum dikerjakan, ${revisi} order revisi. Yuk dicek.`
      }
    };

    try {
      await admin.messaging().send(message);
    } catch (e) {
      console.error("Gagal kirim FCM:", e);
    }

    await settingsRef.set({ lastReminderAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return null;
  });
