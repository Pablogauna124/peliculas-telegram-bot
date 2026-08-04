import { config } from "./config.js";

const API_BASE = `https://api.telegram.org/bot${config.botToken}`;
const FILE_BASE = `https://api.telegram.org/file/bot${config.botToken}`;

async function callApi(method, payload = {}, { signal } = {}) {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta invalida de Telegram [${response.status}]: ${text}`);
  }

  if (!response.ok || data.ok !== true) {
    throw new Error(`Telegram ${method} fallo [${response.status}]: ${text}`);
  }

  return data.result;
}

export function getMe() {
  return callApi("getMe");
}

export function deleteWebhook() {
  return callApi("deleteWebhook", { drop_pending_updates: false });
}

export function getUpdates(offset, signal) {
  return callApi(
    "getUpdates",
    {
      offset,
      timeout: config.pollTimeoutSeconds,
      allowed_updates: [
        "message",
        "edited_message",
        "callback_query",
      ],
    },
    { signal },
  );
}

export function sendMessage(chatId, text, extra = {}) {
  return callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    ...extra,
  });
}

/** Devuelve los metadatos del archivo (incluye file_path y file_size). */
export function getFile(fileId) {
  return callApi("getFile", { file_id: fileId });
}

/** URL de descarga directa para un file_path devuelto por getFile. */
export function buildFileUrl(filePath) {
  return `${FILE_BASE}/${filePath}`;
}
