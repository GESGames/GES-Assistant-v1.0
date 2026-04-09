"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");
  const chatInput = document.getElementById("chat-input");
  const taskList = document.getElementById("task-list");
  const usageBadge = document.getElementById("usage-count");

  const MAX_FREE_TASKS = 5;

  // 1. Navigation
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // 2. Chat - Send with Enter
  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text) return;
    appendChat("USER", text);
    chatInput.value = "";
    
    chrome.runtime.sendMessage({ type: "GES_AI_REQUEST", prompt: text }, (res) => {
      appendChat("AI", res.text || "Error in core.");
    });
  };

  document.getElementById("btn-send-chat").onclick = sendMessage;
  chatInput.onkeydown = (e) => { if (e.key === "Enter") sendMessage(); };

  function appendChat(role, msg) {
    const box = document.getElementById("chat-box");
    box.innerHTML += `<p><strong>${role}:</strong> ${msg}</p>`;
    box.scrollTop = box.scrollHeight;
  }

  // 3. Task Management (Auto-Pilot)
  const renderTasks = async () => {
    const data = await chrome.storage.local.get(['scheduledTasks', 'isPro']);
    const tasks = data.scheduledTasks || [];
    const isPro = data.isPro || false;

    usageBadge.innerText = `${tasks.length}/${isPro ? '∞' : MAX_FREE_TASKS}`;
    taskList.innerHTML = "";

    tasks.forEach((task, index) => {
      const card = document.createElement("div");
      card.className = "task-card";
      card.innerHTML = `
        <span class="time">[${task.time}]</span> <strong>${task.desc}</strong>
        <div style="font-size:9px; color:#777">Next execution: Every day</div>
      `;
      taskList.appendChild(card);
    });
  };

  document.getElementById("btn-add-task").onclick = async () => {
    const desc = document.getElementById("task-desc").value;
    const time = document.getElementById("task-time").value;
    
    if (!desc || !time) return alert("Fill all fields");

    const data = await chrome.storage.local.get(['scheduledTasks', 'isPro']);
    const tasks = data.scheduledTasks || [];

    if (!data.isPro && tasks.length >= MAX_FREE_TASKS) {
      return alert("Limit reached. Upgrade to PRO for more tasks!");
    }

    tasks.push({ desc, time });
    await chrome.storage.local.set({ scheduledTasks: tasks });
    
    // Set a Chrome Alarm
    chrome.alarms.create(`task-${tasks.length}`, {
      when: calculateNextTime(time),
      periodInMinutes: 1440 // Daily
    });

    renderTasks();
  };

  function calculateNextTime(timeStr) {
    const [hrs, mins] = timeStr.split(':');
    const now = new Date();
    const target = new Date();
    target.setHours(hrs, mins, 0, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }

  renderTasks();
});