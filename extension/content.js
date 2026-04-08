/**
 * GES Assistant v1.0 — content.js
 * Se inyecta en cada página. Detecta el sitio activo, extrae contexto
 * y ejecuta automatizaciones con IA en respuesta a mensajes del background.
 */

"use strict";

// ─────────────────────────────────────────────
//  CONFIGURACIÓN DE SITIOS SOPORTADOS
// ─────────────────────────────────────────────

const SITE_RULES = {
  "mail.google.com": {
    name: "Gmail",
    detect: () => document.querySelector('[data-message-id]') !== null,
    extractors: {
      emailBody:    () => document.querySelector('.a3s.aiL')?.innerText?.trim() ?? null,
      emailSubject: () => document.querySelector('h2.hP')?.innerText?.trim() ?? null,
      emailSender:  () => document.querySelector('.gD')?.getAttribute('email') ?? null,
    },
    automations: ["reply_email", "summarize_email", "label_email"],
  },
  "calendar.google.com": {
    name: "Google Calendar",
    detect: () => document.querySelector('[data-eventid]') !== null,
    extractors: {
      eventTitle: () => document.querySelector('[data-eventchip]')?.innerText?.trim() ?? null,
    },
    automations: ["summarize_meeting", "create_agenda"],
  },
  "www.linkedin.com": {
    name: "LinkedIn",
    detect: () => document.querySelector('.feed-shared-update-v2') !== null,
    extractors: {
      feedPosts: () => [...document.querySelectorAll('.feed-shared-update-v2')]
        .slice(0, 5)
        .map(el => el.innerText?.trim().slice(0, 300))
        .filter(Boolean),
      profileName: () => document.querySelector('.text-heading-xlarge')?.innerText?.trim() ?? null,
    },
    automations: ["generate_post", "reply_comment", "summarize_feed"],
  },
  "twitter.com": {
    name: "Twitter / X",
    detect: () => document.querySelector('[data-testid="tweet"]') !== null,
    extractors: {
      tweets: () => [...document.querySelectorAll('[data-testid="tweetText"]')]
        .slice(0, 5)
        .map(el => el.innerText?.trim())
        .filter(Boolean),
    },
    automations: ["generate_tweet", "reply_tweet"],
  },
  "www.notion.so": {
    name: "Notion",
    detect: () => document.querySelector('.notion-page-content') !== null,
    extractors: {
      pageContent: () => document.querySelector('.notion-page-content')?.innerText?.trim().slice(0, 1000) ?? null,
      pageTitle:   () => document.querySelector('.notion-title')?.innerText?.trim() ?? null,
    },
    automations: ["summarize_page", "expand_notes", "generate_tasks"],
  },
  "docs.google.com": {
    name: "Google Docs",
    detect: () => document.querySelector('.kix-appview-editor') !== null,
    extractors: {
      docText: () => [...document.querySelectorAll('.kix-lineview')]
        .map(el => el.innerText)
        .join(' ')
        .trim()
        .slice(0, 1500) ?? null,
    },
    automations: ["proofread_doc", "summarize_doc", "translate_doc"],
  },
  "default": {
    name: "Página genérica",
    detect: () => true,
    extractors: {
      pageTitle:   () => document.title ?? null,
      pageText:    () => document.body?.innerText?.trim().slice(0, 1500) ?? null,
      metaDesc:    () => document.querySelector('meta[name="description"]')?.content ?? null,
      allLinks:    () => [...document.querySelectorAll('a[href]')]
        .slice(0, 20)
        .map(a => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(l => l.text),
    },
    automations: ["summarize_page", "extract_data", "translate_page"],
  },
};

// ─────────────────────────────────────────────
//  DETECTAR SITIO ACTUAL
// ─────────────────────────────────────────────

function detectSite() {
  const host = window.location.hostname;
  for (const [domain, rule] of Object.entries(SITE_RULES)) {
    if (domain === "default") continue;
    if (host.includes(domain) && rule.detect()) return { domain, rule };
  }
  return { domain: "default", rule: SITE_RULES["default"] };
}

// ─────────────────────────────────────────────
//  EXTRAER CONTEXTO DE LA PÁGINA
// ─────────────────────────────────────────────

function extractPageContext(rule) {
  const context = {
    url:       window.location.href,
    title:     document.title,
    site:      rule.name,
    timestamp: new Date().toISOString(),
    data:      {},
  };
  for (const [key, fn] of Object.entries(rule.extractors)) {
    try {
      context.data[key] = fn();
    } catch (e) {
      context.data[key] = null;
    }
  }
  return context;
}

// ─────────────────────────────────────────────
//  EJECUTORES DE AUTOMATIZACIONES
// ─────────────────────────────────────────────

const AUTOMATION_RUNNERS = {

  reply_email: async (context) => {
    const { emailBody, emailSubject, emailSender } = context.data;
    if (!emailBody) return { success: false, error: "No se encontró cuerpo del email" };
    const reply = await callGESApi("reply_email", { emailBody, emailSubject, emailSender });
    injectReplyInGmail(reply.text);
    return { success: true, result: reply.text };
  },

  summarize_email: async (context) => {
    const { emailBody, emailSubject } = context.data;
    if (!emailBody) return { success: false, error: "No se encontró cuerpo del email" };
    const summary = await callGESApi("summarize", { text: emailBody, subject: emailSubject });
    showGESToast(`📧 Resumen: ${summary.text}`, "info");
    return { success: true, result: summary.text };
  },

  summarize_page: async (context) => {
    const text = context.data.pageText || context.data.pageContent || context.data.docText;
    if (!text) return { success: false, error: "No hay texto en la página" };
    const summary = await callGESApi("summarize", { text, title: context.title });
    showGESToast(`📄 ${summary.text}`, "info", 8000);
    return { success: true, result: summary.text };
  },

  generate_post: async (context) => {
    const { feedPosts, profileName } = context.data;
    const post = await callGESApi("generate_post", { feedPosts, profileName, platform: "linkedin" });
    copyToClipboard(post.text);
    showGESToast("✅ Post generado y copiado al portapapeles", "success");
    return { success: true, result: post.text };
  },

  generate_tweet: async (context) => {
    const { tweets } = context.data;
    const tweet = await callGESApi("generate_post", { context: tweets, platform: "twitter" });
    copyToClipboard(tweet.text);
    showGESToast("🐦 Tweet generado y copiado", "success");
    return { success: true, result: tweet.text };
  },

  extract_data: async (context) => {
    const { pageText, allLinks } = context.data;
    const data = await callGESApi("extract_data", { text: pageText, links: allLinks });
    showGESToast("📊 Datos extraídos y enviados al dashboard", "success");
    return { success: true, result: data };
  },

  summarize_meeting: async (context) => {
    const { eventTitle } = context.data;
    const summary = await callGESApi("summarize_meeting", { eventTitle });
    showGESToast(`📅 Reunión resumida: ${summary.text}`, "info", 6000);
    return { success: true, result: summary.text };
  },

  expand_notes: async (context) => {
    const { pageContent, pageTitle } = context.data;
    const expanded = await callGESApi("expand_notes", { notes: pageContent, title: pageTitle });
    copyToClipboard(expanded.text);
    showGESToast("📝 Notas expandidas y copiadas", "success");
    return { success: true, result: expanded.text };
  },

  translate_page: async (context) => {
    const { pageText } = context.data;
    const translated = await callGESApi("translate", { text: pageText?.slice(0, 800) });
    showGESToast(`🌍 Traducción: ${translated.text}`, "info", 10000);
    return { success: true, result: translated.text };
  },
};

// ─────────────────────────────────────────────
//  LLAMADA AL BACKGROUND (IA VÍA SERVICE WORKER)
// ─────────────────────────────────────────────

function callGESApi(action, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "GES_AI_REQUEST", action, payload },
      (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
        if (response?.error)          return reject(response.error);
        resolve(response);
      }
    );
  });
}

// ─────────────────────────────────────────────
//  ACCIONES DOM — INYECCIONES EN PÁGINAS
// ─────────────────────────────────────────────

function injectReplyInGmail(replyText) {
  // Busca el área de respuesta activa de Gmail y la rellena
  const replyBox = document.querySelector('[aria-label="Cuerpo del mensaje"][contenteditable="true"]')
    || document.querySelector('[g_editable="true"]');
  if (replyBox) {
    replyBox.focus();
    replyBox.innerText = replyText;
    replyBox.dispatchEvent(new Event("input", { bubbles: true }));
    showGESToast("✅ Respuesta insertada en Gmail", "success");
  } else {
    copyToClipboard(replyText);
    showGESToast("📋 Respuesta copiada al portapapeles (abre el campo primero)", "warning");
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity  = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

// ─────────────────────────────────────────────
//  TOAST DE NOTIFICACIÓN EN PANTALLA
// ─────────────────────────────────────────────

function showGESToast(message, type = "info", duration = 4000) {
  const existing = document.getElementById("ges-toast");
  if (existing) existing.remove();

  const colors = {
    info:    { bg: "#EEEDFE", border: "#AFA9EC", text: "#3C3489" },
    success: { bg: "#E1F5EE", border: "#5DCAA5", text: "#085041" },
    warning: { bg: "#FAEEDA", border: "#EF9F27", text: "#633806" },
    error:   { bg: "#FCEBEB", border: "#F09595", text: "#791F1F" },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.id = "ges-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: ${c.text};
    padding: 12px 16px;
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: 500;
    max-width: 360px;
    line-height: 1.5;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    display: flex;
    align-items: flex-start;
    gap: 10px;
    animation: ges-slidein 0.25s ease;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "×";
  closeBtn.style.cssText = `background:none;border:none;cursor:pointer;font-size:16px;
    line-height:1;color:${c.text};opacity:0.6;padding:0;margin-left:auto;flex-shrink:0;`;
  closeBtn.onclick = () => toast.remove();

  const logo = document.createElement("span");
  logo.innerText = "G";
  logo.style.cssText = `width:20px;height:20px;border-radius:5px;background:#534AB7;
    color:#EEEDFE;display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;flex-shrink:0;`;

  const msg = document.createElement("span");
  msg.innerText = message;
  msg.style.flex = "1";

  toast.appendChild(logo);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);

  const style = document.createElement("style");
  style.textContent = `@keyframes ges-slidein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => toast?.remove(), duration);
}

// ─────────────────────────────────────────────
//  OBSERVER: DETECCIÓN DE CAMBIOS DE PÁGINA (SPA)
// ─────────────────────────────────────────────

let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onPageChange();
  }
});
urlObserver.observe(document.body, { childList: true, subtree: true });

function onPageChange() {
  const { domain, rule } = detectSite();
  chrome.runtime.sendMessage({
    type: "GES_PAGE_CHANGED",
    payload: {
      url:          location.href,
      site:         rule.name,
      domain,
      automations:  rule.automations,
      timestamp:    new Date().toISOString(),
    },
  });
}

// ─────────────────────────────────────────────
//  LISTENER: MENSAJES DESDE BACKGROUND / POPUP
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, automation } = message;

  if (type === "GES_GET_CONTEXT") {
    const { rule } = detectSite();
    const context  = extractPageContext(rule);
    sendResponse({ success: true, context });
    return true;
  }

  if (type === "GES_RUN_AUTOMATION") {
    const { domain, rule } = detectSite();
    const context          = extractPageContext(rule);
    const runner           = AUTOMATION_RUNNERS[automation];

    if (!runner) {
      sendResponse({ success: false, error: `Automatización '${automation}' no reconocida` });
      return true;
    }

    if (!rule.automations.includes(automation)) {
      showGESToast(`⚠️ '${automation}' no está disponible en ${rule.name}`, "warning");
      sendResponse({ success: false, error: "Automatización no disponible en esta página" });
      return true;
    }

    showGESToast(`⚡ Ejecutando automatización en ${rule.name}...`, "info", 2500);

    runner(context)
      .then(result => sendResponse(result))
      .catch(err   => {
        showGESToast(`❌ Error: ${err}`, "error");
        sendResponse({ success: false, error: String(err) });
      });

    return true; // mantiene el canal abierto para respuesta async
  }

  if (type === "GES_SHOW_TOAST") {
    showGESToast(message.text, message.toastType || "info", message.duration);
    sendResponse({ success: true });
    return true;
  }
});

// ─────────────────────────────────────────────
//  INIT: ANUNCIAR PÁGINA AL BACKGROUND EN CARGA
// ─────────────────────────────────────────────

(function init() {
  const { domain, rule } = detectSite();
  chrome.runtime.sendMessage({
    type: "GES_PAGE_LOADED",
    payload: {
      url:         location.href,
      site:        rule.name,
      domain,
      automations: rule.automations,
      timestamp:   new Date().toISOString(),
    },
  });
})();
