export function getChannelsMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "➕ Agregar canal",
            callback_data: "channel_add",
          },
        ],
        [
          {
            text: "📋 Listar canales",
            callback_data: "channel_list",
          },
        ],
        [
          {
            text: "🗑️ Eliminar canal",
            callback_data: "channel_delete",
          },
        ],
        [
          {
            text: "⬅️ Volver",
            callback_data: "menu_home",
          },
        ],
      ],
    },
  };
}

export function showChannelsMenu({
  chatId,
  messageId,
  editMessageText,
}) {
  return editMessageText(
    chatId,
    messageId,
    "📺 <b>Administración de canales</b>",
    getChannelsMenuKeyboard(),
  );
}
