async function callGeminiAPI(action, payload) {
  const apiKey = await storageGet(STORAGE_KEYS.API_KEY);
  if (!apiKey) throw new Error("Falta la API Key de Google Gemini en Ajustes.");

  const prompt = PROMPTS[action]?.(payload);
  
  // URL de la API de Google Gemini (Gratis hasta 15 RPM)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Error en la API de Google");
  }

  const data = await response.json();
  const text = data.candidates[0].content.pa