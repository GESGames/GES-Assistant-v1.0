"use strict";

const STORAGE_KEYS = { API_KEY: "ges_api_key", HISTORY: "ges_history" };

async function callOpenRouterAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];

  if (!apiKey) throw new Error("Configura la API Key de OpenRouter en los ajustes.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,  // ← OpenRouter usa Bearer token
      "HTTP-Referer": "https://ges-assistant.extension", // identifica tu app
      "X-Title": "GES Assistant"
    },
    body: JSON.stringify({
      model: "openrouter/free"
      messages: [{ role: "user", content: promptText }]
    })
  });

  const resData = await response.json();

  if (response.status === 429) {
    throw new Error("Límite de OpenRouter alcanzado (espera un momento).");
  }

  if (!response.ok) {
    throw new Error(resData.error?.message || "Error en la API de OpenRouter");
  }

  // OpenRouter usa formato OpenAI: choices[0].message.content
  return resData.choices[0].message.content;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callOpenRouterAPI(message.prompt)   // ← nombre de función actualizado
      .then(async (text) => {
        const histData = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
        const history = histData[STORAGE_KEYS.HISTORY] || [];
        history.unshift({
          date: new Date().toLocaleTimeString(),
          action: message.action || "Tarea",
          text: text.substring(0, 100) + "..."
        });
        await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history.slice(0, 10) });

        sendResponse({ text });
      })
      .catch(err => {
        console.error(err);
        sendResponse({ error: err.message });
      });
    return true;
  }

  if (message.type === "GES_SET_API_KEY") {
    chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});