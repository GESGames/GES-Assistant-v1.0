"use strict";

const STORAGE_KEYS = {
  API_KEY: "ges_api_key",
  HISTORY: "ges_history",
  SETTINGS: "ges_settings"
};

// Guardar en el historial
async function addToHistory(action, input, output) {
  const history = await chrome.storage.local.get(STORAGE_KEYS.HISTORY).then(res => res[STORAGE_KEYS.HISTORY] || []);
  const newItem = {
    id: Date.now(),
    date: new Date().toLocaleString(),
    action,
    input: input.substring(0, 50) + "...",
    output: output.substring(0, 100) + "..."
  };
  history.unshift(newItem); // Añadir al principio
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history.slice(0, 20) }); // Guardar últimos 20
}

async function callGeminiAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];
  
  if (!apiKey) throw new Error("Configura tu API Key en Ajustes.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
  });

  const resData = await response.json();
  if (!response.ok) throw new Error(resData.error?.message || "Error API");
  return resData.candidates[0].content.parts[0].text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callGeminiAPI(message.prompt)
      .then(async text => {
        await addToHistory(message.action || "Chat", message.prompt, text);
        sendResponse({ text });
      })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === "GES_SET_API_KEY") {
    chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});