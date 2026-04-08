"use strict";

const DEFAULT_AUTOS = [
  { id: 1, name: "Resumir", emoji: "📄", action: "summarize", fav: true },
  { id: 2, name: "Email", emoji: "📧", action: "reply_email", fav: false },
  { id: 3, name: "LinkedIn", emoji: "🐦", action: "generate_post", fav: false }
];

document.addEventListener("DOMContentLoaded", () => {
  renderAutomations();
  renderHistory();
  setupButtons();
  setupTabs();
});

// RENDERIZAR AUTOMATIZACIONES Y FAVORITOS
async function renderAutomations() {
  const data = await chrome.storage.local.get("ges_autos");
  const autos = data.ges_autos || DEFAULT_AUTOS;
  const list = document.getElementById("auto-list");
  if(!list) return;
  list.innerHTML = "";

  // Ordenar: favoritos primero
  autos.sort((a, b) => b.fav - a.fav).forEach(auto => {
    const item = document.createElement("div");
    item.className = "auto-item";
    item.innerHTML = `
      <div class="auto-emoji" style="background:${auto.fav ? '#FAEEDA' : '#F7F7F5'}">${auto.emoji}</div>
      <div class="auto-info">
        <div class="auto-name">${auto.name}</div>
      </div>
      <button class="fav-btn" style="background:none; border:none; cursor:pointer; font-size:16px;">${auto.fav ? '⭐' : '☆'}</button>
      <button class="run-btn" data-action="${auto.action}">▶</button>
    `;

    // Botón Favorito
    item.querySelector(".fav-btn").addEventListener("click", () => toggleFav(auto.id));
    
    // Botón Ejecutar
    item.querySelector(".run-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", action: auto.action, prompt: "Haz la tarea: " + auto.name });
    });

    list.appendChild(item);
  });
}

async function toggleFav(id) {
  const data = await chrome.storage.local.get("ges_autos");
  let autos = data.ges_autos || DEFAULT_AUTOS;
  autos = autos.map(a => a.id === id ? { ...a, fav: !a.fav } : a);
  await chrome.storage.local.set({ "ges_autos": autos });
  renderAutomations();
}

// CHAT IA
async function sendChat() {
  const input = document.getElementById("chat-input");
  const box = document.getElementById("chat-box");
  const text = input.value.trim();
  if(!text) return;

  box.innerHTML += `<p><b>Tú:</b> ${text}</p>`;
  input.value = "";

  chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", prompt: text }, (res) => {
    if(res.error) box.innerHTML += `<p style="color:red">Error: ${res.error}</p>`;
    else {
      box.innerHTML += `<p style="color:var(--purple)"><b>IA:</b> ${res.text}</p>`;
      renderHistory();
    }
    box.scrollTop = box.scrollHeight;
  });
}

// HISTORIAL
async function renderHistory() {
  const data = await chrome.storage.local.get("ges_history");
  const history = data.ges_history || [];
  const list = document.getElementById("history-list");
  if(!list) return;
  list.innerHTML = history.map(h => `
    <div style="border-bottom:1px solid #eee; padding:5px; font-size:10px;">
      <b>[${h.date}] ${h.action}</b><br>${h.output}
    </div>
  `).join("");
}

// BOTONES Y API KEY
function setupButtons() {
  // GUARDAR API KEY (CORREGIDO)
  document.getElementById("btn-save-key")?.addEventListener("click", () => {
    const key = document.getElementById("api-key-input").value.trim();
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, () => {
      alert("¡Clave guardada!");
      document.getElementById("api-key-input").value = "";
    });
  });

  document.getElementById("btn-send-chat")?.addEventListener("click", sendChat);
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab, .panel").forEach(el => el.classList.remove("active"));
      t.classList.add("active");
      document.getElementById(`panel-${t.dataset.tab}`).classList.add("active");
    });
  });
}