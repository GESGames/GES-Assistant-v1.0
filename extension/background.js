"use strict";

const STORAGE_KEYS = { API_KEY: "ges_api_key", HISTORY: "ges_history" };

async function callGeminiAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];
  
  if (!apiKey) throw new Error("Falta la API Key en Ajustes.");

  // URL CAMBIADA A V1 (ESTABLE) para evitar el error de 'model not found'
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });

  const resData = await response.json();
  if (!response.ok) throw new Error(resData.error?.message || "Error en la API");
  
  return resData.candidates[0].content.parts[0].text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callGeminiAPI(message.prompt)
      .then(async text => {
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