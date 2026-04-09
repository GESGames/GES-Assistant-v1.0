"use strict";

const STORAGE_KEYS = { API_KEY: "ges_api_key", HISTORY: "ges_history" };

async function callOpenRouterAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];

  if (!apiKey) throw new Error("Configura la API Key en Ajustes.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: promptText }]
    })
  });

  const resData = await response.json();
  if (!response.ok) throw new Error(resData.error?.message || "Error API");
  return resData.choices?.[0]?.message?.content || "Sin respuesta";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callOpenRouterAPI(message.prompt)
      .then(text => sendResponse({ text }))
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