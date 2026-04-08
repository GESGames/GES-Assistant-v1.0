"use strict";

const DEFAULT_AUTOS = [
  { id: 1, name: "Resumir Web", emoji: "📄", action: "summarize", fav: true },
  { id: 2, name: "Responder Email", emoji: "📧", action: "reply_email", fav: false },
  { id: 3, name: "Crear Post", emoji: "🐦", action: "generate_post", fav: false },
  { id: 4, name: "Traducir", emoji: "🌍", action: "translate", fav: false }
];

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  await renderAutomations();
  setupEventListeners();
});

// --- SISTEMA DE PESTAÑAS ---
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const targetPanel = document.getElementById(`panel-${target}`);
      if (targetPanel) targetPanel.classList.add("active");

      if (target === "history") renderHistory();
      if (target === "home") renderAutomations();
    });
  });
}

// --- HOME Y FAVORITOS ---
async function renderAutomations() {
  const data = await chrome.storage.local.get("ges_autos");
  const autos = data.ges_autos || DEFAULT_AUTOS;
  const list = document.getElementById("auto-list");
  if (!list) return;

  list.innerHTML = "";
  // Ordenar: Favoritos arriba
  autos.sort((a, b) => b.fav - a.fav).forEach(auto => {
    const div = document.createElement("div");
    div.className = "auto-item";
    div.innerHTML = `
      <span style="font-size:20px;">${auto.emoji}</span>
      <div style="flex:1; font-weight:bold; font-size:12px;">${auto.name}</div>
      <button class="fav-btn">${auto.fav ? '⭐' : '☆'}</button>
      <button class="btn run-btn" style="padding:5px 10px;">▶</button>
    `;

    div.querySelector(".fav-btn").onclick = () => toggleFav(auto.id);
    div.querySelector(".run-btn").onclick = () => runTask(auto.name);
    
    list.appendChild(div);
  });
}

async function toggleFav(id) {
  const data = await chrome.storage.local.get("ges_autos");
  let autos = data.ges_autos || DEFAULT_AUTOS;
  autos = autos.map(a => a.id === id ? { ...a, fav: !a.fav } : a);
  await chrome.storage.local.set({ "ges_autos": autos });
  renderAutomations();
}

// --- CHAT IA ---
function setupEventListeners() {
  // Botón enviar chat
  document.getElementById("btn-send-chat")?.addEventListener("click", sendChatMessage);
  
  // Enter en el chat
  document.getElementById("chat-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });

  // Guardar API Key
  document.getElementById("btn-save-key")?.addEventListener("click", () => {
    const key = document.getElementById("api-key-input").value.trim();
    if (!key) return alert("Por favor, introduce una clave válida.");
    
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, (res) => {
      alert("¡Configuración guardada!");
      document.getElementById("api-key-input").value = "";
    });
  });
}

function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const box = document.getElementById("chat-box");
  const msg = input.value.trim();
  if (!msg) return;

  box.innerHTML += `<div style="margin-bottom:8px;"><b>Tú:</b> ${msg}</div>`;
  input.value = "";
  box.scrollTop = box.scrollHeight;

  chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", prompt: msg, action: "Chat" }, (res) => {
    if (res.error) {
      box.innerHTML += `<div style="color:red; margin-bottom:8px;"><b>Error:</b> ${res.error}</div>`;
    } else {
      box.innerHTML += `<div style="color:var(--purple); margin-bottom:8px;"><b>IA:</b> ${res.text}</div>`;
    }
    box.scrollTop = box.scrollHeight;
  });
}

async function runTask(taskName) {
  const box = document.getElementById("chat-box"); // Reutilizamos el box para feedback
  alert(`Ejecutando: ${taskName}`);
  chrome.runtime.sendMessage({ 
    type: "GES_AI_REQUEST", 
    prompt: `Actúa como un asistente. Por favor haz esto: ${taskName} sobre la pestaña actual.`, 
    action: taskName 
  });
}

// --- HISTORIAL ---
async function renderHistory() {
  const data = await chrome.storage.local.get("ges_history");
  const history = data.ges_history || [];
  const list = document.getElementById("history-list");
  if (!list) return;

  if (history.length === 0) {
    list.innerHTML = "<p style='font-size:11px; color:gray;'>No hay acciones recientes.</p>";
    return;
  }

  list.innerHTML = history.map(h => `
    <div class="hist-item">
      <div style="color:var(--purple); font-weight:bold;">[${h.date}] ${h.action}</div>
      <div style="color:#666;">${h.text}</div>
    </div>
  `).join("");
}