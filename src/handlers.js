import { downloadVideo, removeTempFile } from "./downloader.js";
import { uploadToStorage } from "./storage.js";
import { sendMessage } from "./telegram.js";
import { logger } from "./logger.js";
import {
  createChannel,
  listChannels,
  updateChannelUrl,
  deleteChannel,
  setChannelActive,
} from "./channels.js";

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

const WELCOME =
  "🎬 <b>Películas PG Bot</b>\n\n" +
  "Podés subir videos y administrar canales de televisión.\n\n" +
  "<b>Comandos:</b>\n" +
  "• <code>/nuevo Nombre | URL | Categoría | Logo</code>\n" +
  "• <code>/listar</code>\n" +
  "• <code>/actualizar slug | nueva URL</code>\n" +
  "• <code>/eliminar slug</code>\n" +
  "• <code>/activar slug</code>\n" +
  "• <code>/desactivar slug</code>\n\n" +
  "El logo es opcional.";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function extractVideo(message) {
  if (message.video) {
    return {
      fileId: message.video.file_id,
      mimeType: message.video.mime_type || "video/mp4",
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
      mimeType: message.animation.mime_type || "video/mp4",
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

function getCommand(text) {
  return String(text || "").split(/\s+/)[0].split("@")[0].toLowerCase();
}

function getCommandArguments(text) {
  return String(text || "").replace(/^\S+\s*/, "").trim();
}

function splitArguments(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim());
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
        `<b>Nombre:</b> ${escapeHtml(displayName)}\n` +
        `<b>Tamaño:</b> ${sizeMb} MB\n\n` +
        `<b>Enlace público:</b>\n${escapeHtml(publicUrl)}`,
    );
  } catch (error) {
    logger.error("Fallo procesando el video:", error.message);

    await sendMessage(
      chatId,
      `❌ <b>No pude procesar el video</b>\n\n${escapeHtml(error.message)}`,
    );
  } finally {
    if (localPath) {
      await removeTempFile(localPath);
    }
  }
}

async function handleCreateChannel(chatId, argumentsText) {
  const [name, url, category = "General", logo = ""] =
    splitArguments(argumentsText);

  if (!name || !url) {
    await sendMessage(
      chatId,
      "❌ <b>Formato incorrecto</b>\n\n" +
        "Usá:\n" +
        "<code>/nuevo Nombre | URL | Categoría | Logo</code>\n\n" +
        "Ejemplo:\n" +
        "<code>/nuevo Canal 13 | https://servidor.com/canal.m3u8 | Aire</code>",
    );
    return;
  }

  const channel = await createChannel({
    name,
    url,
    category,
    logo: logo || null,
  });

  await sendMessage(
    chatId,
    "✅ <b>Canal creado correctamente</b>\n\n" +
      `<b>Nombre:</b> ${escapeHtml(channel.name)}\n` +
      `<b>Identificador:</b> <code>${escapeHtml(channel.slug)}</code>\n` +
      `<b>Tipo detectado:</b> ${escapeHtml(channel.type)}\n` +
      `<b>Categoría:</b> ${escapeHtml(channel.category)}\n` +
      `<b>Estado:</b> ${channel.active ? "Activo" : "Desactivado"}`,
  );
}

async function handleListChannels(chatId) {
  const channels = await listChannels();

  if (channels.length === 0) {
    await sendMessage(chatId, "📺 Todavía no hay canales guardados.");
    return;
  }

  const lines = channels.map(
    (channel, index) =>
      `${index + 1}. ${channel.active ? "🟢" : "🔴"} ` +
      `<b>${escapeHtml(channel.name)}</b>\n` +
      `   <code>${escapeHtml(channel.slug)}</code> · ${escapeHtml(channel.type)}`,
  );

  const chunks = [];
  let current = "📺 <b>Canales guardados</b>\n\n";

  for (const line of lines) {
    if ((current + line).length > 3500) {
      chunks.push(current);
      current = "";
    }

    current += `${line}\n\n`;
  }

  if (current) chunks.push(current);

  for (const chunk of chunks) {
    await sendMessage(chatId, chunk);
  }
}

async function handleUpdateChannel(chatId, argumentsText) {
  const [slug, newUrl] = splitArguments(argumentsText);

  if (!slug || !newUrl) {
    await sendMessage(
      chatId,
      "❌ <b>Formato incorrecto</b>\n\n" +
        "Usá:\n" +
        "<code>/actualizar slug | nueva URL</code>\n\n" +
        "Ejemplo:\n" +
        "<code>/actualizar canal-13 | https://nuevo-enlace.com/live.m3u8</code>",
    );
    return;
  }

  const channel = await updateChannelUrl(slug, newUrl);

  await sendMessage(
    chatId,
    "✅ <b>Enlace actualizado</b>\n\n" +
      `<b>Canal:</b> ${escapeHtml(channel.name)}\n` +
      `<b>Identificador:</b> <code>${escapeHtml(channel.slug)}</code>\n` +
      `<b>Tipo detectado:</b> ${escapeHtml(channel.type)}`,
  );
}

async function handleDeleteChannel(chatId, argumentsText) {
  const slug = argumentsText.trim();

  if (!slug) {
    await sendMessage(
      chatId,
      "Usá: <code>/eliminar slug-del-canal</code>",
    );
    return;
  }

  const channel = await deleteChannel(slug);

  await sendMessage(
    chatId,
    `🗑️ Canal eliminado: <b>${escapeHtml(channel.name)}</b>`,
  );
}

async function handleChannelStatus(chatId, argumentsText, active) {
  const slug = argumentsText.trim();

  if (!slug) {
    await sendMessage(
      chatId,
      `Usá: <code>/${active ? "activar" : "desactivar"} slug-del-canal</code>`,
    );
    return;
  }

  const channel = await setChannelActive(slug, active);

  await sendMessage(
    chatId,
    `${active ? "🟢" : "🔴"} <b>${escapeHtml(channel.name)}</b> ` +
      `quedó ${active ? "activo" : "desactivado"}.`,
  );
}

async function handleTextCommand(chatId, text) {
  const command = getCommand(text);
  const argumentsText = getCommandArguments(text);

  try {
    switch (command) {
      case "/start":
      case "/help":
        await sendMessage(chatId, WELCOME);
        return true;

      case "/nuevo":
      case "/agregarcanal":
        await handleCreateChannel(chatId, argumentsText);
        return true;

      case "/listar":
      case "/canales":
        await handleListChannels(chatId);
        return true;

      case "/actualizar":
      case "/actualizarcanal":
        await handleUpdateChannel(chatId, argumentsText);
        return true;

      case "/eliminar":
      case "/eliminarcanal":
        await handleDeleteChannel(chatId, argumentsText);
        return true;

      case "/activar":
        await handleChannelStatus(chatId, argumentsText, true);
        return true;

      case "/desactivar":
        await handleChannelStatus(chatId, argumentsText, false);
        return true;

      default:
        return false;
    }
  } catch (error) {
    logger.error("Fallo administrando canales:", error.message);

    await sendMessage(
      chatId,
      `❌ <b>Error</b>\n\n${escapeHtml(error.message)}`,
    );

    return true;
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

  if (text) {
    const commandHandled = await handleTextCommand(chatId, text);

    if (commandHandled) return;
  }

  const video = extractVideo(message);

  if (video) {
    await handleVideo(chatId, video);
    return;
  }

  if (text) {
    await sendMessage(
      chatId,
      "No reconocí ese comando. Usá /help para ver las opciones.",
    );
  }
}
