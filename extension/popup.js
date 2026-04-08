"use strict";

// 1. AUTOMATIZACIONES POR DEFECTO
const DEFAULT_AUTOMATIONS = [
  { id: "auto_1", name: "Responder emails",    emoji: "📧", bg: "#E1F5EE", action: "reply_email",    sites: ["Gmail"],    active: true,  pro: false, runs: 0 },
  { id: "auto_2", name: "Resumen de reuniones",emoji: "📋", bg: "#EEEDFE", action: "summarize_meeting",sites:["Google Calendar"],active:true, pro:false, runs:0 },
  { id: "auto_3", name: "Posts en LinkedIn",   emoji: "🐦", bg: "#FAEEDA", action: "generate_post",  sites: ["LinkedIn"], active: false, pro: true,  runs: 0 },
  { id: "auto_4", name: "Monitor de precios",  emoji: "🛒", bg: "#FAECE7", action: "extract_data",   sites: ["Genérico"], active: false, pro: false, runs: 0 },
  { id: "auto_5", name: "Informe semanal",     emoji: "📊", bg: "#E6F1FB", action: "summarize_page", sites: ["Genérico"], active: false, pro: true,  runs: 0  },
];

let state = {
  plan: "free",
  used: 0,
  limit: 5,
  automations: [],
  settings: { notifs: true, allpages: true, silent: false },
};

// 2. INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupToggles();
  setupButtons();
  await loadState();
  renderDashboard();
  renderPlanCards();
  loadSettings();
});

async function loadState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GES_GET_STATUS" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        state.automations = DEFAULT_AUTOMATIONS;
        resolve();
        return;
      }
      state.plan = response.plan ?? "free";
      state.used = response.used ?? 0;
      state.limit = response.limit ?? 5;
      state.automations = response.automations?.length ? response.automations : DEFAULT_AUTOMATIONS;
      resolve();
    });
  });
}

// 3. RENDERIZADO DEL DASHBOARD
function renderDashboard() {
  document.getElementById("loading-block").style.display = "none";
  document.getElementById("dashboard-content").style.display = "block";

  const isPro = state.plan !== "free";
  const limitNum = isPro ? "∞" : String(state.limit);
  const pct = isPro ? 0 : Math.min(100, Math.round((state.used / state.limit) * 100));

  document.getElementById("stat-used").textContent = state.used;
  document.getElementById("stat-limit").textContent = limitNum;
  document.getElementById("stat-total").textContent = state.automations.length;
  document.getElementById("limit-text").textContent = isPro ? `${state.used} / ∞` : `${state.used} / ${state.limit}`;

  const bar = document.getElementById("limit-bar");
  bar.style.width = `${pct}%`;
  bar.className = "bar-fill" + (pct >= 100 ? " full" : pct >= 60 ? " warn" : "");

  renderAutomations();
}

function renderAutomations() {
  const list = document.getElementById("auto-list");
  list.innerHTML = "";

  state.automations.forEach((auto) => {
    const isPro = state.plan !== "free";
    const isLocked = auto.pro && !isPro;
    const item = document.createElement("div");
    item.className = "auto-item";
    
    // Aquí está la línea que mencionabas, ahora dentro del contexto correcto
    item.innerHTML = `
      <div class="auto-emoji" style="background:${auto.bg}">${auto.emoji}</div>
      <div class="auto-info">
        <div class="auto-name">${auto.name}</div>
        <div class="auto-sub">${auto.runs} ejecuciones</div>
      </div>
      <span class="badge ${isLocked ? 'badge-pro' : 'badge-active'}">${isLocked ? 'Pro' : 'Activa'}</span>
      <button class="run-btn" data-id="${auto.id}">▶</button>
    `;

    item.querySelector(".run-btn").addEventListener("click", () => {
      if (isLocked) { switchTab("plans"); return; }
      executeAction(auto);
    });

    list.appendChild(item);
  });
}

async function executeAction(auto) {
  showToast(`⚡ Ejecutando "${auto.name}"...`, "warn");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { type: "GES_RUN_AUTOMATION", automation: auto.action }, (response) => {
    if (chrome.runtime.lastError || !response || response.error) {
      showToast("❌ Error: " + (response?.error || "No se pudo ejecutar"), "error");
    } else {
      auto.runs++;
      state.used++;
      renderDashboard();
      showToast("✅ ¡Completado!", "success");
    }
  });
}

// 4. BOTONES Y AJUSTES (CLAVE DE GOOGLE CORREGIDA)
function setupButtons() {
  // GUARDAR API KEY (Sin restricciones de sk-ant-)
  document.getElementById("btn-save-key")?.addEventListener("click", () => {
    const key = document.getElementById("api-key-input").value.trim();
    if (key.length < 10) {
      showToast("⚠️ Clave no válida", "warn");
      return;
    }
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, () => {
      showToast("✅ API Key de Google guardada", "success");
      document.getElementById("api-key-input").value = "";
    });
  });

  document.getElementById("btn-refresh")?.addEventListener("click", () => location.reload());
  document.getElementById("btn-settings-shortcut")?.addEventListener("click", () => switchTab("settings"));
  document.getElementById("btn-upgrade")?.addEventListener("click", () => switchTab("plans"));
  document.getElementById("link-anthropic")?.addEventListener("click", () => chrome.tabs.create({ url: "https://aistudio.google.com/" }));
  
  // Borrar datos
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (confirm("¿Borrar todo?")) {
      chrome.storage.sync.clear(() => location.reload());
    }
  });
}

// 5. FUNCIONES DE APOYO (TABS, TOGGLES, PLANES)
function setupTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${tabName}`));
}

function setupToggles() {
  document.querySelectorAll(".toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("on");
      btn.classList.toggle("off");
    });
  });
}

function renderPlanCards() {
  document.querySelectorAll(".plan-card").forEach(card => {
    card.classList.toggle("current", card.dataset.plan === state.plan);
  });
}

function loadSettings() {
  chrome.storage.sync.get("ges_settings", (data) => {
    if (data.ges_settings) state.settings = data.ges_settings;
  });
}

function showToast(text, type) {
  const area = document.getElementById("toast-area");
  area.innerHTML = `<div class="toast-inline toast-${type}">${text}</div>`;
  setTimeout(() => { area.innerHTML = ""; }, 3500);
}