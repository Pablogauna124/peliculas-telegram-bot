export function getMainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📺 Canales", callback_data: "menu_channels" },
          { text: "📥 Listas M3U", callback_data: "menu_lists" },
        ],
        [
          { text: "👥 Usuarios", callback_data: "menu_users" },
          { text: "📡 Verificaciones", callback_data: "menu_checks" },
        ],
        [
          { text: "📊 Estadísticas", callback_data: "menu_stats" },
          { text: "⚙️ Configuración", callback_data: "menu_settings" },
        ],
      ],
    },
  };
}

export async function showHomeMenu({
  chatId,
  messageId,
  sendMessage,
  editMessageText,
}) {
  const text =
    "🎬 <b>PG IPTV ADMIN</b>\n\nSeleccioná una opción:";

  if (messageId) {
    return editMessageText(
      chatId,
      messageId,
      text,
      getMainMenuKeyboard(),
    );
  }

  return sendMessage(
    chatId,
    text,
    getMainMenuKeyboard(),
  );
}
