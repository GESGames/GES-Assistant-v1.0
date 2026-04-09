"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");
  const chatBox = document.getElementById("chat-box");
  const chatInput = document.getElementById("chat-input");
  const btnSendChat = document.getElementById("btn-send-chat");
  const energyFill = document.getElementById("energy-fill");
  const usageText = document.getElementById("usage-text");

  const MAX_FREE_ACTIONS = 5;

  // --- 1. Daily Limit Logic ---
  async function checkUsage() {
    const today = new Date().toLocaleDateString();
    let data = await chrome.storage.local.get(['usageCount', 'lastDate', 'isPro']);
    
    if (data.isPro) {
      usageText.innerText = "UNLIMITED";
      energyFill.style.width = "100%";
      return true;
    }

    if (data.lastDate !== today) {
      data = { usageCount: 0, lastDate: today };
      await chrome.storage.local.set(data);
    }

    const remaining = MAX_FREE_ACTIONS - data.usageCount;
    usageText.innerText = `${remaining}/${MAX_FREE_ACTIONS} LEFT`;
    energyFill.style.width = `${(remaining / MAX_FREE_ACTIONS) * 100}%`;

    return remaining > 0;
  }

  async function incrementUsage() {
    let data = await chrome.storage.local.get(['usageCount', 'isPro']);
    if (data.isPro) return;
    await chrome.storage.local.set({ usageCount: (data.usageCount || 0) + 1 });
    checkUsage();
  }

  // --- 2. Tab Navigation ---
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // --- 3. Chat Logic ---
  function appendMsg(role, text) {
    const d = document.createElement("div");
    d.style.marginBottom = "10px";
    d.style.color = role === 'user' ? '#fff' : 'var(--neon-cyan)';
    d.innerHTML = `<strong>${role === 'user' ? '>> USER' : '>> AI'}:</strong><br>${text}`;
    chatBox.appendChild(d);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  async function handleExecution() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    const hasEnergy = await checkUsage();
    if (!hasEnergy) {
      appendMsg("system", "ENERGY DEPLETED. Upgrade to PRO or wait 24h.");
      return;
    }

    appendMsg("user", prompt);
    chatInput.value = "";

    chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", prompt: prompt }, (res) => {
      if (res && res.text) {
        appendMsg("ai", res.text);
        incrementUsage();
      } else {
        appendMsg("ai", "ERROR: " + (res?.error || "Connection lost"));
      }
    });
  }

  btnSendChat.onclick = handleExecution;
  chatInput.onkeydown = (e) => { if (e.key === "Enter") handleExecution(); };

  // --- 4. Render Home Actions ---
  function renderActions() {
    const actions = [
      { name: "Grammar Fix", emoji: "🛰️", prompt: "Correct the grammar: " },
      { name: "Fast Summary", emoji: "💾", prompt: "Summarize this: " },
      { name: "Translate EN", emoji: "🌐", prompt: "Translate to English: " }
    ];
    
    const list = document.getElementById("auto-list");
    list.innerHTML = "";
    actions.forEach(act => {
      const item = document.createElement("div");
      item.style.padding = "12px";
      item.style.border = "1px solid #333";
      item.style.marginBottom = "8px";
      item.style.cursor = "pointer";
      item.style.borderRadius = "4px";
      item.innerHTML = `${act.emoji} ${act.name}`;
      item.onclick = () => {
        tabs[1].click(); // Go to Chat
        chatInput.value = act.prompt;
        chatInput.focus();
      };
      list.appendChild(item);
    });
  }

  // --- 5. Settings ---
  document.getElementById("btn-save-key").onclick = () => {
    const key = document.getElementById("api-key-input").value;
    chrome.runtime.sendMessage({ type: "GES_SET_API_KEY", apiKey: key }, () => {
      alert("System Updated.");
    });
  };

  checkUsage();
  renderActions();
});