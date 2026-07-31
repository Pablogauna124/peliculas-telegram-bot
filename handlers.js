import { downloadVideo, removeTempFile } from "./downloader.js";
import { uploadToStorage } from "./storage.js";
import { sendMessage } from "./telegram.js";
import { logger } from "./logger.js";

const WELCOME =
  "Hola! Enviame un video y te devuelvo un enlace publico.\n\n" +
  "Tambien acepto videos enviados como documento o video-nota.";

/** Extrae el objeto de video de cualquier variante de mensaje. */
function extractVideo(message) {
  if (message.video) return { fileId: message.video.file_id, mimeType: message.video.mime_type };
  if (message.video_note) return { fileId: message.video_note.file_id, mimeType: "video/mp4" };
  if (message.animation)
    return { fileId: message.animation.file_id, mimeType: message.animation.mime_type };
  if (message.document && String(message.document.mime_type || "").startsWith("video/")) {
    return { fileId: message.document.file_id, mimeType: message.document.mime_type };
  }
  return null;
}

async function handleVideo(chatId, video) {
  await sendMessage(chatId, "Procesando tu video...");

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
    await sendMessage(
      chatId,
      `Listo!\n\n<b>Tamano:</b> ${sizeMb} MB\n<b>file_id:</b> <code>${video.fileId}</code>\n<b>Enlace:</b> ${publicUrl}`,
    );
  } catch (error) {
    logger.error("Fallo procesando el video:", error.message);
    await sendMessage(chatId, `No pude procesar el video: ${error.message}`);
  } finally {
    if (localPath) await removeTempFile(localPath);
  }
}

export async function handleUpdate(update) {
  const message = update.message || update.edited_message;
  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  const text = message.text?.trim();

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
    await sendMessage(chatId, "Enviame un video para generar el enlace publico.");
  }
}
