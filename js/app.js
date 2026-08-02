const VIEW_STORAGE_KEY = "orderTracker_currentView";

document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveView(btn.dataset.view);
  });
});

function setActiveView(viewName) {
  document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === viewName));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = el("view-" + viewName);
  if (target) target.classList.add("active");
  localStorage.setItem(VIEW_STORAGE_KEY, viewName);
}

// Pulihkan menu terakhir yang dibuka saat app di-refresh/dibuka ulang
const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
if (savedView && el("view-" + savedView)) {
  setActiveView(savedView);
}
