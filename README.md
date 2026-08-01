# Martien Design — Order Tracker (PWA)

Listing sederhana buat tracking status order desain. Bukan file manager —
tanpa upload file/thumbnail. Bisa di-install ke HP Android sebagai PWA,
dan ngirim reminder notifikasi walau app ditutup.

## Struktur file

```
design-order-tracker/
├── index.html              # UI utama (dashboard, order, arsip, pengaturan)
├── css/style.css           # Tema navy
├── js/firebase-config.js   # ISI CONFIG FIREBASE KAMU DI SINI
├── js/app.js                # Semua logic (CRUD, filter, sort, notif, dst)
├── manifest.json            # Biar bisa di-install ke HP
├── service-worker.js        # Cache offline + terima push notif di background
├── icons/                   # Icon PWA (placeholder MD navy — ganti kalau mau logo asli)
├── firestore.rules          # Aturan keamanan database
├── firebase.json            # Config deploy Firebase
└── functions/                # Cloud Function scheduler buat reminder
    ├── index.js
    └── package.json
```

## Fitur yang sudah dibuat

- ✅ Listing order: nama desain, klien (nama + WA), kategori project, sumber order, tingkat kesulitan, status
- ✅ Tombol klik WA langsung dari list
- ✅ Status flow: Belum Dikerjakan → Revisi → Selesai (dropdown langsung di tabel)
- ✅ Tab aktif (Semua/Belum/Revisi), arsip terpisah buat yang Selesai
- ✅ Search, sort (terbaru/terlama/nama/kesulitan), filter kategori & sumber
- ✅ Badge tingkat kesulitan (Mudah/Sedang/Susah) dengan warna beda
- ✅ Flag urgent manual per order
- ✅ Autocomplete nama & WA klien dari order sebelumnya
- ✅ Dashboard ringkas + breakdown per kategori & sumber
- ✅ Export CSV
- ✅ Kategori & sumber bisa ditambah sendiri (tidak hardcode)
- ✅ Kunci PIN 4 digit
- ✅ Login admin (Firebase Auth)
- ✅ PWA installable
- ✅ Reminder notifikasi custom interval, tetap muncul walau app ditutup (via Firebase Cloud Messaging + Cloud Function scheduler)

---

## LANGKAH SETUP (harus dikerjakan sebelum app bisa jalan)

### 1. Buat project Firebase
1. Buka https://console.firebase.google.com → **Add project**
2. Setelah project jadi, klik ikon **Web (</>)** untuk daftarkan web app
3. Copy config yang muncul (apiKey, authDomain, dst)

### 2. Isi config di kode
- Buka `js/firebase-config.js`, ganti semua nilai `GANTI_...` dengan config asli
- Buka `service-worker.js`, di bagian `firebase.initializeApp({...})` — **isi persis sama** dengan config di atas (service worker gak bisa import file config, jadi harus di-duplikat manual)

### 3. Aktifkan Authentication
- Firebase Console → **Authentication** → Sign-in method → aktifkan **Email/Password**
- Di tab **Users**, tambahkan 1 user manual (email + password kamu sendiri) — ini yang dipakai buat login ke app

### 4. Aktifkan Firestore
- Firebase Console → **Firestore Database** → Create database → mode **Production**
- Deploy rules-nya (lihat langkah 6) atau paste manual isi `firestore.rules` di tab Rules

### 5. Setup Cloud Messaging (buat notifikasi)
- Firebase Console → **Project Settings** → tab **Cloud Messaging**
- Di bagian **Web Push certificates**, klik **Generate key pair**
- Copy key itu, paste ke `VAPID_KEY` di `js/firebase-config.js`

### 6. Deploy (pakai Firebase CLI)
```bash
npm install -g firebase-tools
firebase login
firebase init          # pilih Hosting, Firestore, Functions — pakai project yang sudah dibuat
firebase deploy
```
> **Catatan biaya:** Cloud Functions dengan scheduler (`pubsub.schedule`) butuh **Blaze Plan**
> (pay-as-you-go). Firebase kasih free tier besar (2 juta invocation/bulan), untuk
> pemakaian 1 orang kemungkinan besar tetap Rp0, tapi tetap wajib upgrade dari Spark
> ke Blaze plan dulu di Firebase Console → Usage & billing, atau Cloud Function tidak akan jalan.

### 7. Kalau tetap mau hosting statis di GitHub (bukan Firebase Hosting)
- Push semua file (kecuali folder `functions/`) ke repo GitHub
- Aktifkan GitHub Pages di Settings → Pages
- Firestore, Auth, dan Cloud Functions **tetap** jalan dari Firebase (cross-origin, gak masalah)
- Cloud Functions (`functions/`) **tetap harus** di-deploy lewat `firebase deploy --only functions` dari command line, gak lewat GitHub

### 8. Test di HP Android
- Buka URL app di Chrome Android → menu (⋮) → **Install app** / **Add to Home screen**
- Buka app, masuk pakai email/password yang dibuat di langkah 3
- Ke menu **Pengaturan** → set PIN, tambah kategori & sumber, aktifkan notifikasi (tombol "Aktifkan Izin Notifikasi"), set interval reminder

---

## Kalau kerjaan ini berhenti di tengah jalan (limit harian dsb)

Semua file sudah lengkap dan siap pakai — gak ada bagian kode yang "setengah jadi".
Yang **wajib** kamu lanjutin sendiri (gak butuh AI lagi, tinggal isi manual):

1. Isi `js/firebase-config.js` dan bagian atas `service-worker.js` dengan config Firebase asli kamu
2. Buat user login di Firebase Auth
3. Generate VAPID key dan tempel ke `VAPID_KEY`
4. Jalankan `firebase deploy` (atau push ke GitHub kalau mau hosting di sana)
5. Upgrade ke Blaze plan biar Cloud Function reminder jalan

Kalau nanti mau lanjut ngobrol lagi soal ini, tinggal bilang **"lanjutin Order Tracker"** —
detail spek lengkapnya sudah saya simpan, tinggal kasih tau langkah mana yang masih kamu perlu bantuan.
