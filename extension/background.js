"use strict";

const STORAGE_KEYS = { API_KEY: "ges_api_key", HISTORY: "ges_history" };

async function callOpenRouterAPI(promptText) {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
  const apiKey = data[STORAGE_KEYS.API_KEY];

  console.log("🔑 API Key cargada:", apiKey ? "SÍ (empieza por " + apiKey.substring(0, 8) + "...)" : "NO HAY KEY");

  if (!apiKey) throw new Error("Configura la API Key de OpenRouter en los ajustes.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ges-assistant.extension",
      "X-Title": "GES Assistant"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: promptText }]
    })
  });

  console.log("📡 HTTP Status:", response.status);

  const resData = await response.json();

  console.log("📦 Respuesta completa:", JSON.stringify(resData, null, 2));

  if (response.status === 429) throw new Error("Límite alcanzado, espera un momento.");
  if (!response.ok) throw new Error(resData.error?.message || "Error en OpenRouter");

  const text = resData.choices?.[0]?.message?.content;
  console.log("✅ Texto extraído:", text);

  if (!text) throw new Error("OpenRouter no devolvió texto. Respuesta: " + JSON.stringify(resData));

  return text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    console.log("📨 Mensaje recibido:", message.action, "| Prompt:", message.prompt?.substring(0, 80) + "...");

    callOpenRouterAPI(message.prompt)
      .then(async (text) => {
        const histData = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
        const history = histData[STORAGE_KEYS.HISTORY] || [];
        history.unshift({
          date: new Date().toLocaleTimeString(),
          action: message.action || "Tarea",
          text: text.substring(0, 100) + "..."
        });
        await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history.slice(0, 10) });

        console.log("✅ Enviando respuesta al popup");
        sendResponse({ text });
      })
      .catch(err => {
        console.error("❌ Error:", err.message);
        sendResponse({ error: err.message });
      });
    return true;
  }

  if (message.type === "GES_SET_API_KEY") {
    chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: message.apiKey }, () => {
      console.log("💾 API Key guardada");
      sendResponse({ success: true });
    });
    return true;
  }
});