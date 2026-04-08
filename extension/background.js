/**
 * GES Assistant v1.0 — background.js
 * Motor de IA de Google Gemini (Gratis)
 */

"use strict";

const STORAGE_KEYS = {
  PLAN: "ges_plan",
  API_KEY: "ges_api_key",
  EXECUTIONS: "ges_executions",
  AUTOMATIONS: "ges_automations",
  SETTINGS: "ges_settings",
};

// 1. HELPERS DE STORAGE
async function storageGet(key) {
  return new Promise(resolve => {
    chrome.storage.sync.get(key, result => resolve(result[key] ?? null));
  });
}

async function storageSet(key, value) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ [key]: value }, resolve);
  });
}

// 2. PROMPTS
const PROMPTS = {
  summarize: (p) => `Resume en 3 frases: ${p.text}`,
  summarize_page: (p) => `Resume esta página: ${p.text || p.title}`,
  reply_email: (p) => `Escribe una respuesta corta a este email: ${p.emailBody}`,
  generate_post: (p) => `Crea un post de LinkedIn sobre esto: ${p.text || p.context}`,
  extract_data: (p) => `Extrae datos clave de este texto: ${p.text}`,
  summarize_meeting: (p) => `Resume esta reunión: ${p.eventTitle}`,
  translate: (p) => `Traduce esto al español: ${p.text}`,
};

// 3. FUNCIÓN PARA GOOGLE GEMINI (GRATIS)
async function callGeminiAPI(action, payload) {
  const apiKey = await storageGet(STORAGE_KEYS.API_KEY);
  if (!apiKey) throw new Error("Falta la API Key en Ajustes.");

  const promptText = PROMPTS[action] ? PROMPTS[action](payload) : `Analiza esto: ${payload.text}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Error de API");
  }

  const data = await response.json();
  return { text: data.candidates[0].content.parts[0].text };
}

// 4. ESCUCHADOR DE MENSAJES
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GES_AI_REQUEST") {
    callGeminiAPI(message.action, message.payload)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true; 
  }

  if (message.type === "GES_GET_STATUS") {
    storageGet(STORAGE_KEYS.EXECUTIONS).then(execs => {
      sendResponse({ 
        used: execs?.count || 0, 
        limit: 5, 
        plan: "free" 
      });
    });
    return true;
  }

  if (message.type === "GES_SET_API_KEY") {
    storageSet(STORAGE_KEYS.API_KEY, message.apiKey).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

console.log("GES Assistant Service Worker Activo.");