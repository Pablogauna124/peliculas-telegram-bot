import { downloadVideo, removeTempFile } from "./downloader.js";
import { uploadToStorage } from "./storage.js";
import { sendMessage } from "./telegram.js";
import { logger } from "./logger.js";

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

const WELCOME =
  "🎬 <b>Películas Bot</b>\n\n" +
  "Enviame un video y lo subiré automáticamente a Cloudflare R2.\n\n" +
  "Acepto:\n" +
  "• Videos\n" +
  "• Documentos de video\n" +
  "• Video-notas";

/** Extrae el objeto de video de cualquier variante de mensaje. */
function extractVideo(message) {
  if (message.video) {
    return {
      fileId: message.video.file_id,
      mimeType: message.video.mime_type,
      originalName: message.video.file_name || null,
    };
  }

  if (message.video_note) {
    return {
      fileId: message.video_note.file_id,
      mimeType: "video/mp4",
      originalName: null,
    };
  }

  if (message.animation) {
    return {
      fileId: message.animation.file_id,
      mimeType: message.animation.mime_type,
      originalName: message.animation.file_name || null,
    };
  }

  if (
    message.document &&
    String(message.document.mime_type || "").startsWith("video/")
  ) {
    return {
      fileId: message.document.file_id,
      mimeType: message.document.mime_type,
      originalName: message.document.file_name || null,
    };
  }

  return null;
}

function isAuthorized(message) {
  if (!ADMIN_TELEGRAM_ID) {
    logger.error("Falta configurar ADMIN_TELEGRAM_ID");
    return false;
  }

  return Number(message.from?.id) === ADMIN_TELEGRAM_ID;
}

async function handleVideo(chatId, video) {
  await sendMessage(chatId, "⏳ <b>Procesando tu video...</b>");

  let localPath;

  try {
    const downloaded = await downloadVideo(video.fileId);
    localPath = downloaded.localPath;

    const { publicUrl } = await uploadToStorage({
      localPath: downloaded.localPath,
      fileName: downloaded.fileName,
      mimeType: video.mimeType,
    });

    const sizeMb = (downloaded.size / 1024 / 1024).toFixed(2);
    const displayName = video.originalName || downloaded.fileName;

    await sendMessage(
      chatId,
      "✅ <b>Video subido correctamente</b>\n\n" +
        `<b>Nombre:</b> ${displayName}\n` +
        `<b>Tamaño:</b> ${sizeMb} MB\n\n` +
        `<b>Enlace público:</b>\n${publicUrl}`,
    );
  } catch (error) {
    logger.error("Fallo procesando el video:", error.message);

    await sendMessage(
      chatId,
      `❌ <b>No pude procesar el video</b>\n\n${error.message}`,
    );
  } finally {
    if (localPath) {
      await removeTempFile(localPath);
    }
  }
}

export async function handleUpdate(update) {
  const message = update.message || update.edited_message;

  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!isAuthorized(message)) {
    logger.warn("Intento de acceso no autorizado", {
      telegramUserId: message.from?.id,
      username: message.from?.username,
    });

    await sendMessage(
      chatId,
      "⛔ No tenés autorización para utilizar este bot.",
    );

    return;
  }

  if (text === "/start" || text === "/help") {
    await sendMessage(chatId, WELCOME);
    return;
  }

  const video = extractVideo(message);

  if (video) {
    await handleVideo(chatId, video);
    return;
  }

  if (text) {
    await sendMessage(
      chatId,
      "📤 Enviame un video para subirlo y generar su enlace público.",
    );
  }
}

  if (text) {
    await sendMessage(chatId, "Enviame un video para generar el enlace publico.");
  }
}
