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

/*
 * Guarda temporalmente las conversaciones activas.
 * Como solo vos usás el bot, alcanza para esta primera versión.
 */
const sessions = new Map();

const WELCOME =
  "🎬 <b>Películas PG Bot</b>\n\n" +
  "Podés subir videos y administrar canales de televisión.\n\n" +
  "<b>Comandos:</b>\n" +
  "• <code>/nuevo</code> — agregar un canal paso a paso\n" +
  "• <code>/listar</code> — ver canales guardados\n" +
  "• <code>/actualizar slug | nueva URL</code>\n" +
  "• <code>/eliminar slug</code>\n" +
  "• <code>/activar slug</code>\n" +
  "• <code>/desactivar slug</code>\n" +
  "• <code>/cancelar</code> — cancelar una operación";

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
  return String(text || "")
    .split(/\s+/)[0]
    .split("@")[0]
    .toLowerCase();
}

function getCommandArguments(text) {
  return String(text || "").replace(/^\S+\s*/, "").trim();
}

function splitArguments(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim());
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

async function startCreateChannel(chatId) {
  sessions.set(chatId, {
    action: "create-channel",
    step: "name",
    data: {},
  });

  await sendMessage(
    chatId,
    "📺 <b>Nuevo canal</b>\n\n" +
      "Enviame el <b>nombre del canal</b>.\n\n" +
      "Podés cancelar con /cancelar.",
  );
}

async function processCreateChannelSession(chatId, text) {
  const session = sessions.get(chatId);

  if (!session || session.action !== "create-channel") {
    return false;
  }

  try {
    if (session.step === "name") {
      if (text.length < 2) {
        await sendMessage(chatId, "El nombre es demasiado corto. Intentá otra vez.");
        return true;
      }

      session.data.name = text;
      session.step = "url";
      sessions.set(chatId, session);

      await sendMessage(
        chatId,
        `✅ Nombre: <b>${escapeHtml(text)}</b>\n\n` +
          "Ahora enviame el <b>enlace de reproducción</b>.",
      );

      return true;
    }

    if (session.step === "url") {
      if (!isValidUrl(text)) {
        await sendMessage(
          chatId,
          "❌ El enlace no parece válido.\n\n" +
            "Debe comenzar con <code>http://</code> o <code>https://</code>.",
        );

        return true;
      }

      session.data.url = text;
      session.step = "category";
      sessions.set(chatId, session);

      await sendMessage(
        chatId,
        "📂 Enviame la <b>categoría</b> del canal.\n\n" +
          "Ejemplos: Deportes, Noticias, Música, Infantiles.\n\n" +
          "También podés escribir <code>General</code>.",
      );

      return true;
    }

    if (session.step === "category") {
      session.data.category = text || "General";
      session.step = "logo";
      sessions.set(chatId, session);

      await sendMessage(
        chatId,
        "🖼️ Enviame la URL del <b>logo</b> del canal.\n\n" +
          "Si no querés agregarlo, escribí:\n" +
          "<code>omitir</code>",
      );

      return true;
    }

    if (session.step === "logo") {
      let logo = null;

      if (text.toLowerCase() !== "omitir") {
        if (!isValidUrl(text)) {
          await sendMessage(
            chatId,
            "❌ La URL del logo no es válida.\n\n" +
              "Enviá una URL válida o escribí <code>omitir</code>.",
          );

          return true;
        }

        logo = text;
      }

      const channel = await createChannel({
        name: session.data.name,
        url: session.data.url,
        category: session.data.category,
        logo,
      });

      sessions.delete(chatId);

      await sendMessage(
        chatId,
        "✅ <b>Canal creado correctamente</b>\n\n" +
          `<b>Nombre:</b> ${escapeHtml(channel.name)}\n` +
          `<b>Identificador:</b> <code>${escapeHtml(channel.slug)}</code>\n` +
          `<b>Tipo:</b> ${escapeHtml(channel.type)}\n` +
          `<b>Categoría:</b> ${escapeHtml(channel.category)}\n` +
          `<b>Estado:</b> ${channel.active ? "Activo" : "Desactivado"}\n\n` +
          `<b>Dirección permanente:</b>\n` +
          `${escapeHtml(process.env.PUBLIC_BASE_URL?.replace(/\/videos\/?$/, "") || "")}` +
          `/tv/${escapeHtml(channel.slug)}`,
      );

      return true;
    }

    return false;
  } catch (error) {
    sessions.delete(chatId);
    logger.error("Fallo creando canal:", error.message);

    await sendMessage(
      chatId,
      `❌ <b>No se pudo crear el canal</b>\n\n${escapeHtml(error.message)}`,
    );

    return true;
  }
}

async function handleCreateChannelDirect(chatId, argumentsText) {
  const [name, url, category = "General", logo = ""] =
    splitArguments(argumentsText);

  if (!name || !url) {
    await startCreateChannel(chatId);
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
      `<b>Categoría:</b> ${escapeHtml(channel.category)}`,
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
      "Usá:\n" +
        "<code>/actualizar slug | nueva URL</code>\n\n" +
        "Ejemplo:\n" +
        "<code>/actualizar canal-13 | https://servidor.com/live.m3u8</code>",
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
    await sendMessage(chatId, "Usá: <code>/eliminar slug-del-canal</code>");
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
    `${active ? "🟢" : "🔴"} <b>${escapeHtml(channel.name)}</b> quedó ` +
      `${active ? "activo" : "desactivado"}.`,
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

      case "/cancelar":
        if (sessions.has(chatId)) {
          sessions.delete(chatId);
          await sendMessage(chatId, "❎ Operación cancelada.");
        } else {
          await sendMessage(chatId, "No hay ninguna operación activa.");
        }

        return true;

      case "/nuevo":
      case "/agregarcanal":
        await handleCreateChannelDirect(chatId, argumentsText);
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

  if (text === "/cancelar") {
    await handleTextCommand(chatId, text);
    return;
  }

  if (text && sessions.has(chatId)) {
    const handledSession = await processCreateChannelSession(chatId, text);

    if (handledSession) return;
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

  if (sessions.has(chatId)) {
    await sendMessage(
      chatId,
      "Necesito que respondas con texto. Podés cancelar con /cancelar.",
    );

    return;
  }

  if (text) {
    await sendMessage(
      chatId,
      "No reconocí ese comando. Usá /help para ver las opciones.",
    );
  }
}
