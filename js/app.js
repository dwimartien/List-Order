// =========================================================================
// Martien Design — Order Tracker
// =========================================================================

let allOrders = [];
let categories = [];
let sources = [];
let settings = {};
let editingOrderId = null;
let currentStatusTab = "all";
let currentDifficulty = null;

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function waLink(number) {
  if (!number) return "#";
  let n = number.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}`;
}

function el(id) { return document.getElementById(id); }
function show(node) { node.style.display = ""; }
function hide(node) { node.style.display = "none"; }

auth.onAuthStateChanged(async user => {
  if (user) {
    if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
      await auth.signOut();
      el("loginError").textContent = "Akun ini tidak diizinkan mengakses app.";
      return;
    }
    hide(el("loginScreen"));
    startApp();
  } else {
    hide(el("app"));
    hide(el("lockScreen"));
    show(el("loginScreen"));
  }
});

el("loginBtn").addEventListener("click", async () => {
  const email = el("loginEmail").value.trim();
  const pass = el("loginPassword").value;
  el("loginError").textContent = "";
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    el("loginError").textContent = "Email/password salah.";
  }
});

el("googleLoginBtn").addEventListener("click", async () => {
  el("loginError").textContent = "";
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error(e);
    el("loginError").textContent = "Gagal masuk dengan Google: " + e.message;
  }
});

el("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  location.reload();
});

let pinBuffer = "";

function renderPinDots() {
  const dots = el("pinDots").children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle("filled", i < pinBuffer.length);
  }
}

async function checkPin() {
  const hash = await sha256(pinBuffer);
  if (hash === settings.pinHash) {
    hide(el("lockScreen"));
    show(el("app"));
    pinBuffer = "";
  } else {
    el("lockError").textContent = "PIN salah, coba lagi.";
    pinBuffer = "";
    renderPinDots();
    setTimeout(() => { el("lockError").textContent = ""; }, 1500);
  }
}

document.querySelectorAll(".pin-pad button[data-num]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (pinBuffer.length >= 4) return;
    pinBuffer += btn.dataset.num;
    renderPinDots();
    if (pinBuffer.length === 4) checkPin();
  });
});
el("pinBackspace").addEventListener("click", () => {
  pinBuffer = pinBuffer.slice(0, -1);
  renderPinDots();
});
el("lockNowBtn").addEventListener("click", () => {
  if (settings.pinHash) {
    hide(el("app"));
    show(el("lockScreen"));
  } else {
    alert("Kamu belum set PIN. Set dulu di menu Pengaturan.");
  }
});

function startApp() {
  db.collection("meta").doc("settings").onSnapshot(doc => {
    settings = doc.exists ? doc.data() : {};
    renderReminderStatus();
    if (settings.pinHash) {
      show(el("lockScreen"));
      hide(el("app"));
    } else {
      hide(el("lockScreen"));
      show(el("app"));
    }
  });

  db.collection("meta").doc("categories").onSnapshot(doc => {
    categories = doc.exists ? (doc.data().list || []) : [];
    renderCategoryChips();
    populateSelect(el("fKategori"), categories);
    populateFilterSelect(el("filterKategori"), categories, "Semua Kategori");
  });

  db.collection("meta").doc("sources").onSnapshot(doc => {
    sources = doc.exists ? (doc.data().list || []) : [];
    renderSourceChips();
    populateSelect(el("fSumber"), sources);
    populateFilterSelect(el("filterSumber"), sources, "Semua Sumber");
  });

  db.collection("orders").orderBy("createdAt", "desc").onSnapshot(snap => {
    allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderOrders();
    renderArchive();
    renderDashboard();
    populateClientDatalist();
    renderFloatingWidget();
  });

  registerServiceWorkerAndMessaging();
}

document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    el("view-" + btn.dataset.view).classList.add("active");
  });
});

function populateSelect(selectEl, list) {
  const current = selectEl.value;
  selectEl.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join("");
  if (list.includes(current)) selectEl.value = current;
}

function populateFilterSelect(selectEl, list, allLabel) {
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${allLabel}</option>` + list.map(c => `<option value="${c}">${c}</option>`).join("");
  selectEl.value = current || "";
}

function renderCategoryChips() {
  el("categoryChipList").innerHTML = categories.map(c => `
    <span class="chip">${c} <button data-remove-cat="${c}">✕</button></span>
  `).join("") || `<span class="muted">Belum ada kategori.</span>`;
  document.querySelectorAll("[data-remove-cat]").forEach(b => {
    b.addEventListener("click", () => removeFromList("categories", b.dataset.removeCat));
  });
}

function renderSourceChips() {
  el("sourceChipList").innerHTML = sources.map(c => `
    <span class="chip">${c} <button data-remove-src="${c}">✕</button></span>
  `).join("") || `<span class="muted">Belum ada sumber.</span>`;
  document.querySelectorAll("[data-remove-src]").forEach(b => {
    b.addEventListener("click", () => removeFromList("sources", b.dataset.removeSrc));
  });
}

async function removeFromList(docName, value) {
  const ref = db.collection("meta").doc(docName);
  const doc = await ref.get();
  const list = (doc.data()?.list || []).filter(v => v !== value);
  await ref.set({ list }, { merge: true });
}

el("addCategoryBtn").addEventListener("click", async () => {
  const val = el("newCategoryInput").value.trim();
  if (!val) return;
  const ref = db.collection("meta").doc("categories");
  const doc = await ref.get();
  const list = doc.exists ? (doc.data().list || []) : [];
  if (!list.includes(val)) list.push(val);
  await ref.set({ list }, { merge: true });
  el("newCategoryInput").value = "";
});

el("addSourceBtn").addEventListener("click", async () => {
  const val = el("newSourceInput").value.trim();
  if (!val) return;
  const ref = db.collection("meta").doc("sources");
  const doc = await ref.get();
  const list = doc.exists ? (doc.data().list || []) : [];
  if (!list.includes(val)) list.push(val);
  await ref.set({ list }, { merge: true });
  el("newSourceInput").value = "";
});

function populateClientDatalist() {
  const seen = new Map();
  allOrders.forEach(o => { if (o.klienNama) seen.set(o.klienNama, o.klienWA || ""); });
  el("clientNameList").innerHTML = Array.from(seen.keys()).map(n => `<option value="${n}">`).join("");
}

el("fKlienNama").addEventListener("input", () => {
  const name = el("fKlienNama").value;
  const match = allOrders.find(o => o.klienNama === name);
  if (match && !el("fKlienWA").value) el("fKlienWA").value = match.klienWA || "";
});

document.querySelectorAll("#statusTabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#statusTabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentStatusTab = tab.dataset.status;
    renderOrders();
  });
});
el("searchInput").addEventListener("input", renderOrders);
el("sortSelect").addEventListener("change", renderOrders);
el("filterKategori").addEventListener("change", renderOrders);
el("filterSumber").addEventListener("change", renderOrders);
el("archiveSearchInput").addEventListener("input", renderArchive);

function getActiveOrders() {
  return allOrders.filter(o => o.status !== "selesai");
}

function applyFilters(list) {
  const q = el("searchInput").value.trim().toLowerCase();
  const kat = el("filterKategori").value;
  const src = el("filterSumber").value;
  let result = list;

  if (currentStatusTab !== "all") result = result.filter(o => o.status === currentStatusTab);
  if (q) result = result.filter(o =>
    (o.nama || "").toLowerCase().includes(q) || (o.klienNama || "").toLowerCase().includes(q)
  );
  if (kat) result = result.filter(o => o.kategori === kat);
  if (src) result = result.filter(o => o.sumber === src);

  const sortVal = el("sortSelect").value;
  const diffRank = { susah: 3, sedang: 2, mudah: 1 };
  result = [...result].sort((a, b) => {
    switch (sortVal) {
      case "createdAt_asc": return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case "nama_asc": return (a.nama || "").localeCompare(b.nama || "");
      case "nama_desc": return (b.nama || "").localeCompare(a.nama || "");
      case "kesulitan_desc": return (diffRank[b.kesulitan] || 0) - (diffRank[a.kesulitan] || 0);
      default: return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
  });
  return result;
}

function renderOrders() {
  const list = applyFilters(getActiveOrders());
  el("orderCountLabel").textContent = `${list.length} order ditemukan`;
  const tbody = el("orderTableBody");

  if (list.length === 0) {
    tbody.innerHTML = "";
    show(el("emptyState"));
    return;
  }
  hide(el("emptyState"));

  tbody.innerHTML = list.map(o => `
    <tr>
      <td class="name-cell">${escapeHtml(o.nama)}${o.urgent ? '<span class="urgent-flag">● URGENT</span>' : ""}
        ${o.catatan ? `<div class="muted" style="font-weight:400;font-size:12px;">${escapeHtml(o.catatan)}</div>` : ""}
      </td>
      <td>
        ${escapeHtml(o.klienNama || "-")}
        ${o.klienWA ? `<br><a class="wa-link" href="${waLink(o.klienWA)}" target="_blank">WA →</a>` : ""}
      </td>
      <td>${escapeHtml(o.kategori || "-")}</td>
      <td>${escapeHtml(o.sumber || "-")}</td>
      <td>${diffBadge(o.kesulitan)}</td>
      <td>
        <select class="status-select" data-id="${o.id}">
          <option value="belum" ${o.status === "belum" ? "selected" : ""}>Belum Dikerjakan</option>
          <option value="revisi" ${o.status === "revisi" ? "selected" : ""}>Revisi</option>
          <option value="selesai" ${o.status === "selesai" ? "selected" : ""}>Selesai</option>
        </select>
      </td>
      <td>${formatDate(o.createdAt)}</td>
      <td class="action-cell">
        <button class="icon-btn" data-edit="${o.id}" title="Edit">✎</button>
        <button class="icon-btn" data-delete="${o.id}" title="Hapus">🗑</button>
      </td>
    </tr>
  `).join("");

  attachRowHandlers(tbody);
}

function renderArchive() {
  const q = el("archiveSearchInput").value.trim().toLowerCase();
  let list = allOrders.filter(o => o.status === "selesai");
  if (q) list = list.filter(o => (o.nama || "").toLowerCase().includes(q) || (o.klienNama || "").toLowerCase().includes(q));
  list = [...list].sort((a, b) => (b.selesaiAt?.seconds || 0) - (a.selesaiAt?.seconds || 0));

  el("archiveCountLabel").textContent = `${list.length} order selesai`;
  const tbody = el("archiveTableBody");

  if (list.length === 0) {
    tbody.innerHTML = "";
    show(el("archiveEmptyState"));
    return;
  }
  hide(el("archiveEmptyState"));

  tbody.innerHTML = list.map(o => `
    <tr>
      <td class="name-cell">${escapeHtml(o.nama)}</td>
      <td>${escapeHtml(o.klienNama || "-")}</td>
      <td>${escapeHtml(o.kategori || "-")}</td>
      <td>${escapeHtml(o.sumber || "-")}</td>
      <td>${diffBadge(o.kesulitan)}</td>
      <td>${formatDate(o.selesaiAt)}</td>
      <td class="action-cell">
        <button class="icon-btn" data-edit="${o.id}" title="Edit">✎</button>
        <button class="icon-btn" data-delete="${o.id}" title="Hapus">🗑</button>
      </td>
    </tr>
  `).join("");

  attachRowHandlers(tbody);
}

function attachRowHandlers(tbody) {
  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openEditModal(b.dataset.edit)));
  tbody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteOrder(b.dataset.delete)));
  tbody.querySelectorAll(".status-select").forEach(s => s.addEventListener("change", () => changeStatus(s.dataset.id, s.value)));
}

function diffBadge(level) {
  const label = { mudah: "Mudah", sedang: "Sedang", susah: "Susah" }[level] || "-";
  if (!level) return "-";
  return `<span class="badge badge-${level}">${label}</span>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

async function changeStatus(id, newStatus) {
  const update = { status: newStatus };
  if (newStatus === "selesai") update.selesaiAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection("orders").doc(id).update(update);
}

async function deleteOrder(id) {
  if (!confirm("Hapus order ini?")) return;
  await db.collection("orders").doc(id).delete();
}

function renderDashboard() {
  const belum = allOrders.filter(o => o.status === "belum").length;
  const revisi = allOrders.filter(o => o.status === "revisi").length;
  const selesai = allOrders.filter(o => o.status === "selesai").length;
  el("statBelum").textContent = belum;
  el("statRevisi").textContent = revisi;
  el("statSelesai").textContent = selesai;
  el("statTotal").textContent = belum + revisi;

  renderBreakdown("catBreakdown", getActiveOrders(), "kategori");
  renderBreakdown("sourceBreakdown", getActiveOrders(), "sumber");
}

function renderBreakdown(containerId, list, field) {
  const counts = {};
  list.forEach(o => {
    const key = o[field] || "Lainnya";
    counts[key] = (counts[key] || 0) + 1;
  });
  const max = Math.max(1, ...Object.values(counts));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const container = el(containerId);
  if (entries.length === 0) {
    container.innerHTML = `<span class="muted">Belum ada data.</span>`;
    return;
  }
  container.innerHTML = entries.map(([label, count]) => `
    <div class="breakdown-row">
      <div style="width:110px;">${escapeHtml(label)}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${(count / max) * 100}%"></div></div>
      <div class="breakdown-count">${count}</div>
    </div>
  `).join("");
}

el("addOrderBtn").addEventListener("click", () => openAddModal());
el("cancelOrderBtn").addEventListener("click", () => closeModal());

document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentDifficulty = btn.dataset.level;
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

function openAddModal() {
  editingOrderId = null;
  currentDifficulty = null;
  el("orderModalTitle").textContent = "Order Baru";
  el("fNamaDesain").value = "";
  el("fKlienNama").value = "";
  el("fKlienWA").value = "";
  el("fUrgent").checked = false;
  el("fCatatan").value = "";
  document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
  if (categories.length) el("fKategori").value = categories[0];
  if (sources.length) el("fSumber").value = sources[0];
  show(el("orderModal"));
}

function openEditModal(id) {
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  editingOrderId = id;
  currentDifficulty = o.kesulitan || null;
  el("orderModalTitle").textContent = "Edit Order";
  el("fNamaDesain").value = o.nama || "";
  el("fKlienNama").value = o.klienNama || "";
  el("fKlienWA").value = o.klienWA || "";
  el("fKategori").value = o.kategori || "";
  el("fSumber").value = o.sumber || "";
  el("fUrgent").checked = !!o.urgent;
  el("fCatatan").value = o.catatan || "";
  document.querySelectorAll(".diff-btn").forEach(b => {
    b.classList.toggle("selected", b.dataset.level === o.kesulitan);
  });
  show(el("orderModal"));
}

function closeModal() {
  hide(el("orderModal"));
}

el("saveOrderBtn").addEventListener("click", async () => {
  const nama = el("fNamaDesain").value.trim();
  if (!nama) { alert("Nama desain wajib diisi."); return; }

  const data = {
    nama,
    klienNama: el("fKlienNama").value.trim(),
    klienWA: el("fKlienWA").value.trim(),
    kategori: el("fKategori").value,
    sumber: el("fSumber").value,
    kesulitan: currentDifficulty,
    urgent: el("fUrgent").checked,
    catatan: el("fCatatan").value.trim(),
  };

  if (editingOrderId) {
    await db.collection("orders").doc(editingOrderId).update(data);
  } else {
    data.status = "belum";
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("orders").add(data);
  }
  closeModal();
});

el("savePinBtn").addEventListener("click", async () => {
  const pin = el("newPinInput").value.trim();
  if (!/^\d{4}$/.test(pin)) { alert("PIN harus 4 digit angka."); return; }
  const pinHash = await sha256(pin);
  await db.collection("meta").doc("settings").set({ pinHash }, { merge: true });
  el("newPinInput").value = "";
  alert("PIN tersimpan.");
});

el("reminderPreset").addEventListener("change", () => {
  el("reminderCustom").style.display = el("reminderPreset").value === "custom" ? "" : "none";
});

el("saveReminderBtn").addEventListener("click", async () => {
  const preset = el("reminderPreset").value;
  let hours = null;
  if (preset === "off") hours = null;
  else if (preset === "custom") hours = parseFloat(el("reminderCustom").value) || null;
  else hours = parseFloat(preset);

  await db.collection("meta").doc("settings").set({
    reminderIntervalHours: hours,
    lastReminderAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  alert("Pengaturan reminder tersimpan.");
});

function renderReminderStatus() {
  if (settings.reminderIntervalHours) {
    el("reminderStatus").textContent = `Reminder aktif tiap ${settings.reminderIntervalHours} jam.`;
    el("reminderPreset").value = [2, 3].includes(settings.reminderIntervalHours) ? String(settings.reminderIntervalHours) : "custom";
    if (el("reminderPreset").value === "custom") {
      el("reminderCustom").style.display = "";
      el("reminderCustom").value = settings.reminderIntervalHours;
    }
  } else {
    el("reminderStatus").textContent = "Reminder belum diaktifkan.";
  }
}

async function registerServiceWorkerAndMessaging() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("service-worker.js");
  } catch (e) {
    console.warn("Gagal daftar service worker:", e);
  }
}

el("enableNotifBtn").addEventListener("click", async () => {
  if (!messaging) { alert("Browser ini tidak mendukung push notification."); return; }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { alert("Izin notifikasi ditolak."); return; }
    const registration = await navigator.serviceWorker.ready;
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    await db.collection("meta").doc("settings").set({ fcmToken: token }, { merge: true });
    alert("Notifikasi aktif!");
  } catch (e) {
    console.error(e);
    alert("Gagal aktifkan notifikasi: " + e.message);
  }
});

let pipWindow = null;

el("openWidgetBtn").addEventListener("click", async () => {
  if (!("documentPictureInPicture" in window)) {
    alert("Fitur widget mengambang butuh Chrome atau Edge versi terbaru di Windows/Mac/Linux. Browser ini belum mendukung.");
    return;
  }
  if (pipWindow) { pipWindow.focus(); return; }

  pipWindow = await documentPictureInPicture.requestWindow({ width: 300, height: 260 });

  [...document.styleSheets].forEach(styleSheet => {
    try {
      const rules = [...styleSheet.cssRules].map(r => r.cssText).join("");
      const style = pipWindow.document.createElement("style");
      style.textContent = rules;
      pipWindow.document.head.appendChild(style);
    } catch (e) {
      const link = pipWindow.document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleSheet.href;
      pipWindow.document.head.appendChild(link);
    }
  });

  pipWindow.document.body.style.margin = "0";
  pipWindow.document.body.innerHTML = `
    <div class="pip-widget">
      <div class="pip-header"><span class="pip-logo">MD</span> Order Tracker</div>
      <div class="pip-stats">
        <div class="pip-stat"><span id="pipBelum">0</span><label>Belum</label></div>
        <div class="pip-stat"><span id="pipRevisi">0</span><label>Revisi</label></div>
      </div>
      <div class="pip-list" id="pipList"></div>
    </div>
  `;

  pipWindow.addEventListener("pagehide", () => { pipWindow = null; });
  renderFloatingWidget();
});

function renderFloatingWidget() {
  if (!pipWindow) return;
  const doc = pipWindow.document;
  const belum = allOrders.filter(o => o.status === "belum").length;
  const revisi = allOrders.filter(o => o.status === "revisi").length;
  const belumEl = doc.getElementById("pipBelum");
  const revisiEl = doc.getElementById("pipRevisi");
  const listEl = doc.getElementById("pipList");
  if (!belumEl) return;

  belumEl.textContent = belum;
  revisiEl.textContent = revisi;

  const active = getActiveOrders().slice(0, 8);
  listEl.innerHTML = active.map(o => `
    <div class="pip-item">
      <span class="pip-dot status-${o.status}"></span>
      <span class="pip-name">${escapeHtml(o.nama)}${o.klienNama ? " — " + escapeHtml(o.klienNama) : ""}</span>
    </div>
  `).join("") || `<div style="color:#A9BAD0; padding:8px; font-size:12px;">Tidak ada order aktif 🎉</div>`;
}

el("exportCsvBtn").addEventListener("click", () => {
  const header = ["Nama Desain", "Klien", "No WA", "Kategori", "Sumber", "Kesulitan", "Status", "Urgent", "Catatan", "Dibuat", "Selesai"];
  const rows = allOrders.map(o => [
    o.nama, o.klienNama, o.klienWA, o.kategori, o.sumber, o.kesulitan, o.status,
    o.urgent ? "Ya" : "Tidak", o.catatan || "", formatDate(o.createdAt), formatDate(o.selesaiAt)
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${(v || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `order-desain-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});
