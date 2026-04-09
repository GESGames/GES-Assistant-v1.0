"use strict";

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const data = await chrome.storage.local.get(['scheduledTasks', 'ges_api_key']);
  // In a real scenario, you'd match the alarm name to the task
  const task = data.scheduledTasks[0]; 

  if (!task) return;

  console.log("🤖 Running Automated Task:", task.desc);

  // 1. Call AI to generate the content/action
  const aiResponse = await callAI(task.desc, data.ges_api_key);

  // 2. Notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png", // make sure you have an icon
    title: "GES Auto-Pilot",
    message: `Executed: ${task.desc}. Result: ${aiResponse.substring(0, 50)}...`
  });

  // 3. (Optional) Here you would use chrome.scripting to inject code into Instagram
  // or use a Webhook to send the post.
});

async function callAI(prompt, key) {
  if (!key) return "No API Key";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: `You are an automated assistant. Perform this task: ${prompt}` }]
    })
  });
  const json = await res.json();
  return json.choices[0].message.content;
}

// Handle Manual Chat Requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GES_AI_REQUEST") {
    chrome.storage.sync.get("ges_api_key", async (data) => {
      try {
        const text = await callAI(msg.prompt, data.ges_api_key);
        sendResponse({ text });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    });
    return true;
  }
});