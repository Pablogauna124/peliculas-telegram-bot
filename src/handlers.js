import { downloadVideo, removeTempFile } from "./downloader.js";
import { uploadToStorage } from "./storage.js";

import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  getFile,
  buildFileUrl,
} from "./telegram.js";

import { logger } from "./logger.js";
import { importM3uContent } from "./m3u.js";

import {
  createChannel,
  listChannels,
  updateChannelUrl,
  deleteChannel,
  setChannelActive,
} from "./channels.js";

import {
  addM3uSource,
  listM3uSources,
  deleteM3uSource,
  setM3uSourceActive,
} from "./m3u-sources.js";
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

import {
  getMainMenuKeyboard,
  showHomeMenu,
} from "./menus/home.js";

import {
  getChannelsMenuKeyboard,
  showChannelsMenu,
} from "./menus/channels.js";

import {
  showListsMenu,
} from "./menus/lists.js";

const sessions = new Map();

const WELCOME =
  "🎬 <b>Películas PG Bot</b>\n\n" +
  "Podés subir videos y administrar canales de televisión.\n\n" +
  "<b>Comandos:</b>\n" +
  "• <code>/nuevo</code> — agregar un canal paso a paso\n" +
  "• <code>/importar</code> — importar una lista M3U\n" +
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
  return String(text || "")
    .replace(/^\S+\s*/, "")
    .trim();
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

function extractM3uDocument(message) {
  const document = message.document;

  if (!document) return null;

  const fileName = String(document.file_name || "").toLowerCase();
  const mimeType = String(document.mime_type || "").toLowerCase();

  const isM3u =
    fileName.endsWith(".m3u") ||
    fileName.endsWith(".m3u8") ||
    mimeType.includes("mpegurl") ||
    mimeType === "audio/x-mpegurl";

  if (!isM3u) return null;

  return {
    fileId: document.file_id,
    fileName: document.file_name || "lista.m3u",
  };
}

function startImportM3u(chatId) {
  sessions.set(chatId, {
    action: "import-m3u",
  });
}

function isWaitingM3u(chatId) {
  return sessions.get(chatId)?.action === "import-m3u";
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
      "Enviame el <b>nombre del canal</b>.",
  );
}

async function processCreateChannel(chatId, text) {
  const session = sessions.get(chatId);

  if (!session || session.action !== "create-channel") {
    return false;
  }

  if (session.step === "name") {
    session.data.name = text;
    session.step = "url";

    await sendMessage(
      chatId,
      "🔗 Ahora enviame el <b>enlace del canal</b>.",
    );

    return true;
  }

  if (session.step === "url") {
    if (!isValidUrl(text)) {
      await sendMessage(
        chatId,
        "❌ Ese enlace no parece válido.\n\nIntentá nuevamente.",
      );

      return true;
    }

    session.data.url = text;
    session.step = "category";

    await sendMessage(
      chatId,
      "📂 Enviame la categoría.\n\n" +
        "Ejemplos: Noticias, Deportes, Películas, Infantiles.",
    );

    return true;
  }

  if (session.step === "category") {
    session.data.category = text || "General";
    session.step = "logo";

    await sendMessage(
      chatId,
      "🖼️ Enviame la URL del logo.\n\n" +
        "O escribí <code>omitir</code>.",
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
        `<b>Slug:</b> <code>${escapeHtml(channel.slug)}</code>\n` +
        `<b>Tipo:</b> ${escapeHtml(channel.type)}`,
    );

    return true;
  }

  return false;
}

async function downloadTextFile(fileId) {
  const fileInfo = await getFile(fileId);
  const fileUrl = buildFileUrl(fileInfo.file_path);

  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(
      `No se pudo descargar la lista M3U [${response.status}]`,
    );
  }

  return response.text();
}

async function fetchM3uFromUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept:
          "application/vnd.apple.mpegurl, application/x-mpegURL, text/plain, */*",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `No se pudo descargar la lista desde la URL [${response.status}]`,
      );
    }

    return response.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La descarga de la lista tardó demasiado.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function importM3uAndReply(chatId, content) {
  await sendMessage(
    chatId,
    "⏳ <b>Importando la lista M3U...</b>\n\n" +
      "Esto puede tardar según la cantidad de canales.",
  );

  const result = await importM3uContent(content);

  let response =
    "✅ <b>Importación finalizada</b>\n\n" +
    `<b>Total encontrados:</b> ${result.total}\n` +
    `<b>Nuevos:</b> ${result.created}\n` +
    `<b>Actualizados:</b> ${result.updated}\n` +
    `<b>Errores:</b> ${result.failed}`;

  if (result.errors?.length) {
    const firstErrors = result.errors.slice(0, 5);

    response +=
      "\n\n<b>Primeros errores:</b>\n" +
      firstErrors
        .map((error) => `• ${escapeHtml(error)}`)
        .join("\n");
  }

  await sendMessage(chatId, response);
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

  let message = "📺 <b>Canales guardados</b>\n\n";

  for (const line of lines) {
    if ((message + line).length > 3500) {
      await sendMessage(chatId, message);
      message = "";
    }

    message += `${line}\n\n`;
  }

  if (message) {
    await sendMessage(chatId, message);
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

  if (!isValidUrl(newUrl)) {
    await sendMessage(chatId, "❌ La nueva URL no parece válida.");
    return;
  }

  const channel = await updateChannelUrl(slug, newUrl);

  await sendMessage(
    chatId,
    "✅ <b>Enlace actualizado</b>\n\n" +
      `<b>Canal:</b> ${escapeHtml(channel.name)}\n` +
      `<b>Identificador:</b> <code>${escapeHtml(channel.slug)}</code>\n` +
      `<b>Tipo:</b> ${escapeHtml(channel.type)}`,
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
      await showHomeMenu({
        chatId,
        sendMessage,
        editMessageText,
      });
      return true;

    case "/nuevo":
    case "/agregarcanal":
      if (argumentsText) {
          const [name, url, category = "General", logo = ""] =
            splitArguments(argumentsText);

          if (!name || !url) {
            await startCreateChannel(chatId);
            return true;
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
              `<b>Slug:</b> <code>${escapeHtml(channel.slug)}</code>\n` +
              `<b>Tipo:</b> ${escapeHtml(channel.type)}`,
          );

          return true;
        }

        await startCreateChannel(chatId);
        return true;

      case "/importar":
        startImportM3u(chatId);

        await sendMessage(
          chatId,
          "📺 <b>Importar lista M3U</b>\n\n" +
            "Ahora podés enviar:\n" +
            "• Un archivo <code>.m3u</code>\n" +
            "• Un archivo <code>.m3u8</code>\n" +
            "• Una URL pública de una lista\n" +
            "• O pegar directamente el contenido M3U\n\n" +
            "Podés cancelar con /cancelar.",
        );

        return true;
        
              case "/agregarlista": {
        const [name, url] = splitArguments(argumentsText);

        if (!name || !url) {
          await sendMessage(
            chatId,
            "Usá:\n<code>/agregarlista Nombre | URL</code>",
          );
          return true;
        }

        const source = await addM3uSource(name, url);

        await sendMessage(
          chatId,
          `✅ Lista agregada\n\n<b>${escapeHtml(source.name)}</b>\n${escapeHtml(source.url)}`,
        );

        return true;
      }

      case "/listas": {
        const sources = await listM3uSources();

        if (!sources.length) {
          await sendMessage(chatId, "No hay listas guardadas.");
          return true;
        }

        let msg = "📺 <b>Listas M3U guardadas</b>\n\n";

        for (const source of sources) {
          msg += `${source.active ? "🟢" : "🔴"} <b>${escapeHtml(source.name)}</b>\n`;
          msg += `${escapeHtml(source.url)}\n\n`;
        }

        await sendMessage(chatId, msg);
        return true;
      }

      case "/eliminarlista": {
        if (!argumentsText) {
          await sendMessage(
            chatId,
            "Usá:\n<code>/eliminarlista Nombre</code>",
          );
          return true;
        }

        const source = await deleteM3uSource(argumentsText);

        await sendMessage(
          chatId,
          `🗑️ Lista eliminada: <b>${escapeHtml(source.name)}</b>`,
        );

        return true;
      }

      case "/activarlista": {
        const source = await setM3uSourceActive(argumentsText, true);

        await sendMessage(
          chatId,
          `🟢 Lista activada: <b>${escapeHtml(source.name)}</b>`,
        );

        return true;
      }

      case "/desactivarlista": {
        const source = await setM3uSourceActive(argumentsText, false);

        await sendMessage(
          chatId,
          `🔴 Lista desactivada: <b>${escapeHtml(source.name)}</b>`,
        );

        return true;
      }
        
           case "/importartodas": {
        const sources = await listM3uSources({
          onlyActive: true,
        });

        if (!sources.length) {
          await sendMessage(
            chatId,
            "❌ No hay listas M3U activas guardadas.",
          );
          return true;
        }

        await sendMessage(
          chatId,
          "⏳ <b>Importación múltiple iniciada</b>\n\n" +
            `<b>Listas activas:</b> ${sources.length}\n` +
            "Se procesarán una por una.",
        );

        const startedAt = Date.now();

        let processedLists = 0;
        let failedLists = 0;
        let totalChannels = 0;
        let createdChannels = 0;
        let updatedChannels = 0;
        let failedChannels = 0;

        const errors = [];

        for (let index = 0; index < sources.length; index += 1) {
          const source = sources[index];

          await sendMessage(
            chatId,
            `📡 <b>${index + 1}/${sources.length}</b> — ` +
              `Importando <b>${escapeHtml(source.name)}</b>...`,
          );

          try {
            const content = await fetchM3uFromUrl(source.url);
            const result = await importM3uContent(content);

            processedLists += 1;
            totalChannels += result.total;
            createdChannels += result.created;
            updatedChannels += result.updated;
            failedChannels += result.failed;

            if (result.errors?.length) {
              errors.push(
                ...result.errors.map(
                  (error) =>
                    `${source.name}: ${error}`,
                ),
              );
            }

            await sendMessage(
              chatId,
              `✅ <b>${escapeHtml(source.name)}</b>\n\n` +
                `Encontrados: ${result.total}\n` +
                `Nuevos: ${result.created}\n` +
                `Actualizados: ${result.updated}\n` +
                `Errores: ${result.failed}`,
            );
          } catch (error) {
            failedLists += 1;

            errors.push(
              `${source.name}: ${error.message}`,
            );

            logger.error(
              `Fallo importando ${source.name}:`,
              error.message,
            );

            await sendMessage(
              chatId,
              `❌ Falló <b>${escapeHtml(source.name)}</b>\n\n` +
                escapeHtml(error.message),
            );
          }
        }

        const elapsedSeconds = Math.round(
          (Date.now() - startedAt) / 1000,
        );

        let response =
          "✅ <b>Importación múltiple finalizada</b>\n\n" +
          `<b>Listas procesadas:</b> ${processedLists}\n` +
          `<b>Listas fallidas:</b> ${failedLists}\n` +
          `<b>Canales encontrados:</b> ${totalChannels}\n` +
          `<b>Nuevos:</b> ${createdChannels}\n` +
          `<b>Actualizados:</b> ${updatedChannels}\n` +
          `<b>Errores de canales:</b> ${failedChannels}\n` +
          `<b>Duración:</b> ${elapsedSeconds} segundos`;

        if (errors.length) {
          response +=
            "\n\n<b>Primeros errores:</b>\n" +
            errors
              .slice(0, 5)
              .map(
                (error) =>
                  `• ${escapeHtml(error)}`,
              )
              .join("\n");
        }

        await sendMessage(chatId, response);
        return true;
      }
      
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

      case "/cancelar":
        sessions.delete(chatId);
        await sendMessage(chatId, "❎ Operación cancelada.");
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
async function handleCallbackQuery(callback) {
  await answerCallbackQuery(callback.id);

  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;

  switch (callback.data) {
      
case "menu_home":
  await showHomeMenu({
    chatId,
    messageId,
    sendMessage,
    editMessageText,
  });
  return;

case "menu_channels":
  await showChannelsMenu({
    chatId,
    messageId,
    editMessageText,
  });
  return;

case "menu_lists":
  await showListsMenu({
    chatId,
    messageId,
    editMessageText,
  });
  return;

case "list_show":
  await handleTextCommand(chatId, "/listas");
  return;

case "list_add":
  await handleTextCommand(chatId, "/agregarlista");
  return;

case "channel_add":
  await startCreateChannel(chatId);
  return;

case "channel_list":
  await handleListChannels(chatId);
  return;

    default:
      await sendMessage(chatId, "🚧 Esta opción estará disponible próximamente.");
      return;
  }
}
export async function handleUpdate(update) {
  const callback = update.callback_query;

  if (callback) {
    return handleCallbackQuery(callback);
  }

  const message =
    update.message || update.edited_message;

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
    sessions.delete(chatId);

    await sendMessage(
      chatId,
      "❎ Operación cancelada.",
    );

    return;
  }

  if (text?.startsWith("/")) {
    const handled = await handleTextCommand(chatId, text);

    if (handled) return;
  }

  if (isWaitingM3u(chatId)) {
    try {
      const m3uDocument = extractM3uDocument(message);

      if (m3uDocument) {
        const content = await downloadTextFile(
          m3uDocument.fileId,
        );

        sessions.delete(chatId);

        await importM3uAndReply(chatId, content);
        return;
      }

      if (text && isValidUrl(text)) {
        const content = await fetchM3uFromUrl(text);

        sessions.delete(chatId);

        await importM3uAndReply(chatId, content);
        return;
      }

      if (text && text.includes("#EXTM3U")) {
        sessions.delete(chatId);

        await importM3uAndReply(chatId, text);
        return;
      }

      await sendMessage(
        chatId,
        "❌ No pude reconocer una lista M3U.\n\n" +
          "Enviá un archivo .m3u, .m3u8, una URL pública " +
          "o contenido que empiece con <code>#EXTM3U</code>.",
      );

      return;
    } catch (error) {
      sessions.delete(chatId);

      logger.error(
        "Fallo importando M3U:",
        error.message,
      );

      await sendMessage(
        chatId,
        "❌ <b>No se pudo importar la lista</b>\n\n" +
          escapeHtml(error.message),
      );

      return;
    }
  }

  if (text && sessions.has(chatId)) {
    try {
      const handled = await processCreateChannel(
        chatId,
        text,
      );

      if (handled) return;
    } catch (error) {
      sessions.delete(chatId);

      logger.error(
        "Error en la conversación:",
        error.message,
      );

      await sendMessage(
        chatId,
        `❌ ${escapeHtml(error.message)}`,
      );

      return;
    }
  }

  if (text) {
    const handled = await handleTextCommand(
      chatId,
      text,
    );

    if (handled) return;
  }

  const video = extractVideo(message);

  if (video) {
    await handleVideo(chatId, video);
    return;
  }

  await sendMessage(
    chatId,
    "No reconocí ese mensaje. Usá <code>/help</code> para ver las opciones.",
  );
}
