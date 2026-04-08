"use strict";

const STORAGE_KEYS = { API_KEY: "ges_api_key", HISTORY: "ges_history" };

async function callGeminiAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];
  
  if (!apiKey) throw new Error("Configura la API Key en los ajustes de la extensión.");

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  //                                                                                            ^^^^^^^^^^
  //                                                                               La API key va en la URL

  const response = await fetch(url, {  // ← "endpoint" → "url"
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });

  const resData = await response.json();

  if (response.status === 429) {
    throw new Error("Límite de Google alcanzado (espera un minuto).");
  }

  if (!response.ok) {
    throw new Error(resData.error?.message || "Error en la API de Gemini");
  }

  return resData.candidates[0].content.parts[0].text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callGeminiAPI(message.prompt)
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