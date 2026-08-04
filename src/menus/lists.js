export function getListsMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "➕ Agregar lista",
            callback_data: "list_add",
          },
        ],
        [
          {
            text: "📋 Ver listas",
            callback_data: "list_show",
          },
        ],
        [
          {
            text: "🔄 Importar todas",
            callback_data: "list_import_all",
          },
        ],
        [
          {
            text: "📤 Exportar playlist",
            callback_data: "playlist_export",
          },
        ],
        [
          {
            text: "🗑️ Eliminar lista",
            callback_data: "list_delete",
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

export function showListsMenu({
  chatId,
  messageId,
  editMessageText,
}) {
  return editMessageText(
    chatId,
    messageId,
    "📥 <b>Administración de listas M3U</b>",
    getListsMenuKeyboard(),
  );
}
