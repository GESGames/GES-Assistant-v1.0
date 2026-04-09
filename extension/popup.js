"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");
  const chatBox = document.getElementById("chat-box");
  const chatInput = document.getElementById("chat-input");
  const btnSendChat = document.getElementById("btn-send-chat");

  // 1. Gestión de Pestañas
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // 2. Función para añadir mensajes al chat
  function appendMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${role === 'user' ? 'msg-user' : 'msg-ia'}`;
    msgDiv.innerHTML = `<strong>${role.toUpperCase()}:</strong><br>${text}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // 3. Función para enviar al Background
  async function sendMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    appendMessage("user", prompt);
    chatInput.value = "";
    const loadingMsg = document.createElement("div");
    loadingMsg.className = "loading-shimmer";
    loadingMsg.innerText = "Procesando respuesta...";
    chatBox.appendChild(loadingMsg);

    chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", prompt: prompt }, (response) => {
      loadingMsg.remove();
      if (response && response.text) {
        appendMessage("ia", response.text);
      } else {
        appendMessage("ia", "Error: " + (response?.error || "Desconocido"));
      }
    });
  }

  // 4. EVENTO: Enviar con CLICK
  btnSendChat.addEventListener("click", sendMessage);

  // 5. EVENTO: Enviar con ENTER
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // 6. Cargar Acciones (Botones de tareas)
  function renderActions() {
    chrome.storage.local.get("custom_actions", (data) => {
      const actions = data.custom_actions || [
        { name: "Corregir Gramática", emoji: "✍️", prompt: "Corrige la gramática del siguiente texto: " },
        { name: "Resumir", emoji: "📜", prompt: "Resume el siguiente texto de forma concisa: " }
      ];
      const list = document.getElementById("auto-list");
      list.innerHTML = "";
      actions.forEach(act => {
        const div = document.createElement("div");
        div.className = "auto-item";
        div.innerHTML = `<span>${act.emoji}</span> <span style="margin-left:10px">${act.name}</span>`;
        div.onclick = () => {
          // Al hacer clic, llevamos el prompt al chat
          tabs[1].click(); // Cambia a pestaña CHAT
          chatInput.value = act.prompt;
          chatInput.focus();
        };
        list.appendChild(div);
      });
    });
  }

  // 7. Guardar Nueva Acción
  document.getElementById("btn-save-action").onclick = () => {
    const name = document.getElementById("new-name").value;
    const emoji = document.getElementById("new-emoji").value;
    const prompt = document.getElementById("new-prompt").value;

    chrome.storage.local.get("custom_actions", (data) => {
      const actions = data.custom_actions || [];
      actions.push({ name, emoji, prompt });
      chrome.storage.local.set({ custom_actions: actions }, () => {
        renderActions();
        tabs[0].click();
      });
    });
  };

  // 8. API Key
  document.getElementById("btn-save-key").onclick = () => {
    const key = document.getElementById("api-key-input").value;
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, (res) => {
      alert("Nivel de acceso actualizado.");
    });
  };

  renderActions();
});