/**
 * GES Assistant v1.0 — popup.js
 * Lógica completa del dashboard: estado, automatizaciones, plan y ajustes.
 */

"use strict";

// ─────────────────────────────────────────────
//  AUTOMATIZACIONES POR DEFECTO (demo)
// ─────────────────────────────────────────────

const DEFAULT_AUTOMATIONS = [
  { id: "auto_1", name: "Responder emails",    emoji: "📧", bg: "#E1F5EE", action: "reply_email",    sites: ["Gmail"],    active: true,  pro: false, runs: 124 },
  { id: "auto_2", name: "Resumen de reuniones",emoji: "📋", bg: "#EEEDFE", action: "summarize_meeting",sites:["Google Calendar"],active:true, pro:false, runs:38 },
  { id: "auto_3", name: "Posts en LinkedIn",   emoji: "🐦", bg: "#FAEEDA", action: "generate_post",  sites: ["LinkedIn"], active: false, pro: true,  runs: 67 },
  { id: "auto_4", name: "Monitor de precios",  emoji: "🛒", bg: "#FAECE7", action: "extract_data",   sites: ["Genérico"], active: false, pro: false, runs: 12 },
  { id: "auto_5", name: "Informe semanal",     emoji: "📊", bg: "#E6F1FB", action: "summarize_page", sites: ["Genérico"], active: false, pro: true,  runs: 8  },
];

// ─────────────────────────────────────────────
//  ESTADO LOCAL
// ─────────────────────────────────────────────

let state = {
  plan:          "free",
  used:          0,
  limit:         5,
  automations:   [],
  currentSite:   "Página desconocida",
  settings: {
    notifs:    true,
    allpages:  true,
    silent:    false,
  },
};

// ─────────────────────────────────────────────
//  INICIALIZACIÓN
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupToggles();
  setupButtons();
  await loadState();
  renderDashboard();
  renderPlanCards();
  loadSettings();
});

// ─────────────────────────────────────────────
//  CARGA DE ESTADO DESDE BACKGROUND
// ─────────────────────────────────────────────

async function loadState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GES_GET_STATUS" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Fallback demo si no hay background activo
        state.automations = DEFAULT_AUTOMATIONS;
        resolve();
        return;
      }
      state.plan        = response.plan   ?? "free";
      state.used        = response.used   ?? 0;
      state.limit       = response.limit  ?? 5;
      state.automations = response.automations?.length
        ? response.automations
        : DEFAULT_AUTOMATIONS;
      resolve();
    });
  });
}

// ─────────────────────────────────────────────
//  RENDER DASHBOARD
// ─────────────────────────────────────────────

function renderDashboard() {
  document.getElementById("loading-block").style.display    = "none";
  document.getElementById("dashboard-content").style.display = "block";

  const isPro     = state.plan !== "free";
  const limitNum  = isPro ? "∞" : String(state.limit);
  const pct       = isPro ? 0 : Math.min(100, Math.round((state.used / state.limit) * 100));

  // Stats
  document.getElementById("stat-used").textContent  = state.used;
  document.getElementById("stat-limit").textContent = limitNum;
  document.getElementById("stat-total").textContent = state.automations.length;

  // Limit bar
  document.getElementById("limit-text").textContent = isPro
    ? `${state.used} / ∞`
    : `${state.used} / ${state.limit}`;

  const bar = document.getElementById("limit-bar");
  bar.style.width = isPro ? "0%" : `${pct}%`;
  bar.className = "bar-fill" + (pct >= 100 ? " full" : pct >= 60 ? " warn" : "");

  // Upgrade banner
  const banner = document.getElementById("upgrade-banner");
  banner.style.display = (!isPro && state.used >= state.limit - 1) ? "flex" : "none";

  // Sitio activo
  chrome.storage.session?.get("ges_current_page", (data) => {
    const page = data?.ges_current_page;
    document.getElementById("current-site").textContent =
      page?.site ?? "Página genérica";
  });

  // Automations list
  renderAutomations();
}

function renderAutomations() {
  const list = document.getElementById("auto-list");
  list.innerHTML = "";

  if (!state.automations.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <p>No tienes automatizaciones aún.<br>Crea tu primera con el botón + Nueva.</p>
      </div>`;
    return;
  }

  state.automations.forEach((auto) => {
    const isPro      = state.plan !== "free";
    const isLocked   = auto.pro && !isPro;
    const badgeClass = isLocked ? "badge-pro" : (auto.active ? "badge-active" : "badge-paused");
    const badgeText  = isLocked ? "Pro" : (auto.active ? "activa" : "pausada");

    const item = document.createElement("div");
    item.className = "auto-item";
    item.innerHTML = `
      <div class="auto-emoji" style="background:${auto.bg}">${auto.emoji}</div>
      <div class="auto-info">
        <div class="auto-name">${auto.name}</div>
        <div class="auto-sub">${auto.runs} ejecuciones · ${(auto.sites || ["Genérico"]).join(", ")}</div>
      </div>
      <span class="badge ${badgeClass}">${badgeText}</span>
      <button class="run-btn" title="Ejecutar ahora" data-id="${auto.id}">▶</button>
      <button class="toggle ${auto.active && !isLocked ? "on" : "off"}" data-id="${auto.id}" ${isLocked ? "disabled" : ""}></button>
    `;

    // Toggle
    item.querySelector(".toggle").addEventListener("click", (e) => {
      if (isLocked) {
        switchTab("plans");
        return;
      }
      const auto = state.automations.find(a => a.id === e.target.dataset.id);
      if (!auto) return;
      auto.active = !auto.active;
      chrome.runtime.sendMessage({ type: "GES_SAVE_AUTOMATION", automation: auto });
      renderAutomations();
    });

    // Run now
    item.querySelector(".run-btn").addEventListener("click", async (e) => {
      if (isLocked) { switchTab("plans"); return; }
      const autoId = e.target.dataset.id;
      const found  = state.automations.find(a => a.id === autoId);
      if (!found) return;

      showToast(`⚡ Ejecutando "${found.name}"...`, "warn");

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { showToast("❌ No hay pestaña activa", "error"); return; }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "GES_RUN_AUTOMATION", automation: found.action },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            showToast("❌ Error al ejecutar. ¿Estás en la página correcta?", "error");
            return;
          }
          if (response.success) {
            found.runs = (found.runs || 0) + 1;
            state.used++;
            renderDashboard();
            showToast(`✅ "${found.name}" completada`, "success");
          } else {
            showToast(`❌ ${response.error}`, "error");
          }
        }
      );
    });

    list.appendChild(item);
  });
}

// ─────────────────────────────────────────────
//  RENDER PLAN CARDS
// ─────────────────────────────────────────────

function renderPlanCards() {
  ["free", "pro", "enterprise"].forEach(planKey => {
    const card = document.getElementById(`plan-${planKey}`);
    if (!card) return;
    card.classList.toggle("current", state.plan === planKey);
    const dot = card.querySelector(".current-dot");
    if (dot) dot.remove();
    if (state.plan === planKey) {
      const d = document.createElement("div");
      d.className = "current-dot";
      card.querySelector(".plan-card-head").appendChild(d);
    }
  });
}

// ─────────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tabName);
  });
  document.querySelectorAll(".panel").forEach(p => {
    p.classList.toggle("active", p.id === `panel-${tabName}`);
  });
}

// ─────────────────────────────────────────────
//  TOGGLES DE AJUSTES
// ─────────────────────────────────────────────

function setupToggles() {
  const toggleMap = {
    "toggle-notifs":   "notifs",
    "toggle-allpages": "allpages",
    "toggle-silent":   "silent",
  };
  Object.entries(toggleMap).forEach(([btnId, key]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.settings[key] = !state.settings[key];
      btn.classList.toggle("on",  state.settings[key]);
      btn.classList.toggle("off", !state.settings[key]);
      saveSettings();
    });
  });
}

// ─────────────────────────────────────────────
//  BOTONES
// ─────────────────────────────────────────────

function setupButtons() {

  // Refresh
  document.getElementById("btn-refresh")?.addEventListener("click", async () => {
    document.getElementById("loading-block").style.display    = "flex";
    document.getElementById("dashboard-content").style.display = "none";
    await loadState();
    renderDashboard();
  });

  // Settings shortcut
  document.getElementById("btn-settings-shortcut")?.addEventListener("click", () => switchTab("settings"));

  // Nueva automatización
  document.getElementById("btn-add")?.addEventListener("click", () => {
    const id   = `auto_${Date.now()}`;
    const names = ["Resumir esta página","Generar tweet","Extraer datos","Traducir texto","Redactar email"];
    const emojis = ["📄","🐦","📊","🌍","📧"];
    const bgs    = ["#E1F5EE","#FAEEDA","#E6F1FB","#EEEDFE","#FAECE7"];
    const idx    = Math.floor(Math.random() * names.length);
    const newAuto = {
      id, name: names[idx], emoji: emojis[idx], bg: bgs[idx],
      action: "summarize_page", sites: ["Genérico"],
      active: true, pro: false, runs: 0,
    };
    state.automations.unshift(newAuto);
    chrome.runtime.sendMessage({ type: "GES_SAVE_AUTOMATION", automation: newAuto });
    renderAutomations();
    showToast(`✅ "${newAuto.name}" creada`, "success");
  });

  // Upgrade banner
  document.getElementById("btn-upgrade")?.addEventListener("click", () => switchTab("plans"));

  // Plan cards
  document.querySelectorAll(".plan-card").forEach(card => {
    card.addEventListener("click", () => {
      const plan = card.dataset.plan;
      if (plan === state.plan) return;
      chrome.runtime.sendMessage({ type: "GES_SET_PLAN", plan }, () => {
        state.plan  = plan;
        state.limit = plan === "free" ? 5 : Infinity;
        renderDashboard();
        renderPlanCards();
        switchTab("dashboard");
        showToast(`✅ Plan cambiado a ${plan === "pro" ? "Pro ⚡" : plan === "enterprise" ? "Empresa" : "Gratuito"}`, "success");
      });
    });
  });

  // Save API key
  document.getElementById("btn-save-key")?.addEventListener("click", () => {
    const key = document.getElementById("api-key-input").value.trim();
    if (!key.startsWith("sk-ant-") && !key.startsWith("sk-")) {
      showToast("⚠️ La API key debe empezar por sk-ant-", "warn"); return;
    }
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, () => {
      showToast("✅ API key guardada correctamente", "success");
      document.getElementById("api-key-input").value = "";
    });
  });

  // Reset datos
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres borrar todos los datos de GES Assistant?")) return;
    chrome.storage.sync.clear(() => {
      state = { plan: "free", used: 0, limit: 5, automations: DEFAULT_AUTOMATIONS, currentSite: "—", settings: { notifs: true, allpages: true, silent: false } };
      renderDashboard();
      renderPlanCards();
      loadSettings();
      switchTab("dashboard");
      showToast("🗑️ Datos borrados", "warn");
    });
  });

  // Open full dashboard
  document.getElementById("btn-open-dash")?.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://ges-assistant.app/dashboard" });
  });

  // Anthropic link
  document.getElementById("link-anthropic")?.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://console.anthropic.com" });
  });
}

// ─────────────────────────────────────────────
//  SETTINGS — CARGA Y GUARDADO
// ─────────────────────────────────────────────

function loadSettings() {
  chrome.storage.sync.get("ges_settings", (data) => {
    if (!data.ges_settings) return;
    state.settings = { ...state.settings, ...data.ges_settings };
    const map = { notifs: "toggle-notifs", allpages: "toggle-allpages", silent: "toggle-silent" };
    Object.entries(map).forEach(([key, btnId]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.classList.toggle("on",  state.settings[key]);
      btn.classList.toggle("off", !state.settings[key]);
    });
  });
}

function saveSettings() {
  chrome.storage.sync.set({ ges_settings: state.settings });
}

// ─────────────────────────────────────────────
//  TOAST INLINE
// ─────────────────────────────────────────────

function showToast(text, type = "success") {
  const area = document.getElementById("toast-area");
  if (!area) return;
  area.innerHTML = `<div class="toast-inline toast-${type}">${text}</div>`;
  setTimeout(() => { area.innerHTML = ""; }, 3500);
}
