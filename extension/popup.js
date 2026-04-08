"use strict";

const BASE_AUTOS = [
  { id: 1, name: "Resumir Web", emoji: "📄", prompt: "Resume este contenido de forma breve", fav: true },
  { id: 2, name: "Traducir", emoji: "🌍", prompt: "Traduce el texto seleccionado al español", fav: false }
];

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  await renderAutomations();
  setupEvents();
});

function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab, .panel").forEach(el => el.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
      if (tab.dataset.tab === "history") renderHistory();
    });
  });
}

async function renderAutomations() {
  const data = await chrome.storage.local.get("custom_autos");
  const autos = data.custom_autos || BASE_AUTOS;
  const list = document.getElementById("auto-list");
  list.innerHTML = "";

  autos.sort((a,b) => b.fav - a.fav).forEach(auto => {
    const div = document.createElement("div");
    div.className = "auto-item";
    div.innerHTML = `
      <span>${auto.emoji}</span>
      <div style="flex:1; font-size:12px; font-weight:bold;">${auto.name}</div>
      <button class="fav-btn">${auto.fav ? '⭐' : '☆'}</button>
      <button class="run-btn" style="background:var(--purple); color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">▶</button>
      ${auto.id > 2 ? '<button class="delete-btn">🗑️</button>' : ''}
    `;

    div.querySelector(".fav-btn").onclick = () => toggleFav(auto.id);
    div.querySelector(".run-btn").onclick = () => runAction(auto);
    if(div.querySelector(".delete-btn")) {
      div.querySelector(".delete-btn").onclick = () => deleteAction(auto.id);
    }
    list.appendChild(div);
  });
}

function setupEvents() {
  document.getElementById("btn-save-action").onclick = async () => {
    const name = document.getElementById("new-name").value;
    const emoji = document.getElementById("new-emoji").value;
    const prompt = document.getElementById("new-prompt").value;
    if(!name || !prompt) return alert("Faltan datos");
    const data = await chrome.storage.local.get("custom_autos");
    const autos = data.custom_autos || [...BASE_AUTOS];
    autos.push({ id: Date.now(), name, emoji: emoji || "⚡", prompt, fav: false });
    await chrome.storage.local.set({ "custom_autos": autos });
    renderAutomations();
    document.getElementById("new-name").value = "";
    document.getElementById("new-prompt").value = "";
  };

  document.getElementById("btn-save-key").onclick = () => {
    const key = document.getElementById("api-key-input").value.trim();
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, () => alert("Clave guardada"));
  };

  document.getElementById("btn-send-chat").onclick = () => {
    const input = document.getElementById("chat-input");
    const box = document.getElementById("chat-box");
    const msg = input.value;
    if(!msg) return;
    box.innerHTML += `<div><b>Tú:</b> ${msg}</div>`;
    chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", prompt: msg, action: "Chat" }, (res) => {
      box.innerHTML += `<div style="color:var(--purple)"><b>IA:</b> ${res.text || res.error}</div>`;
      box.scrollTop = box.scrollHeight;
    });
    input.value = "";
  };
}

async function runAction(auto) {
  // 1. Obtener la pestaña actual
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return alert("No hay una pestaña activa.");

  // 2. Pedir contexto al content.js
  chrome.tabs.sendMessage(tab.id, { type: "GES_GET_CONTEXT" }, (response) => {
    // Si hay un error de conexión con la página
    if (chrome.runtime.lastError || !response || !response.context) {
      alert("Recarga la página para que la extensión pueda leer el contenido.");
      return;
    }

    const pageText = response.context.data.pageText || response.context.data.pageContent || "";
    const promptFinal = `${auto.prompt}\n\nTexto de la web:\n${pageText}`;

    // 3. Enviar a la IA
    chrome.runtime.sendMessage({ 
      type: "GES_AI_REQUEST", 
      prompt: promptFinal, 
      action: auto.name 
    }, (res) => {
      if (res.error) {
        alert("Error de IA: " + res.error);
      } else {
        alert("Resultado:\n" + res.text);
      }
    });
  });
}

async function toggleFav(id) {
  const data = await chrome.storage.local.get("custom_autos");
  let autos = data.custom_autos || [...BASE_AUTOS];
  autos = autos.map(a => a.id === id ? {...a, fav: !a.fav} : a);
  await chrome.storage.local.set({ "custom_autos": autos });
  renderAutomations();
}

async function deleteAction(id) {
  const data = await chrome.storage.local.get("custom_autos");
  let autos = data.custom_autos || [];
  autos = autos.filter(a => a.id !== id);
  await chrome.storage.local.set({ "custom_autos": autos });
  renderAutomations();
}

async function renderHistory() {
  const data = await chrome.storage.local.get("ges_history");
  const hist = data.ges_history || [];
  document.getElementById("history-list").innerHTML = hist.map(h => `
    <div style="font-size:10px; border-bottom:1px solid #eee; padding:5px;">
      <b>${h.date} - ${h.action}</b><br>${h.text}
    </div>
  `).join("");
}