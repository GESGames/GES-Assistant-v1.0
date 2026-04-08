"use strict";

const STORAGE_KEYS = {
  API_KEY: "ges_api_key",
  HISTORY: "ges_history"
};

// Función para llamar a Google Gemini 1.5 Flash (Versión Estable v1)
async function callGeminiAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];
  
  if (!apiKey) throw new Error("Configura tu API Key en Ajustes.");

  // URL corregida a v1/models/gemini-1.5-flash
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });

  const resData = await response.json();
  if (!response.ok) throw new Error(resData.error?.message || "Error en la API de Google");
  
  return resData.candidates[0].content.parts[0].text;
}

// Escuchador de mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callGeminiAPI(message.prompt)
      .then(async text => {
        // Guardar en el historial de forma automática
        const histData = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
        const history = histData[STORAGE_KEYS.HISTORY] || [];
        history.unshift({ 
          id: Date.now(),
          date: new Date().toLocaleTimeString(), 
          action: message.action || "Chat", 
          text: text.substring(0, 100) + "..." 
        });
        await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history.slice(0, 15) });
        
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