import { listM3uSources } from "../m3u-sources.js";

export async function showDeleteListMenu(chatId, sendMessage) {
  const lists = await listM3uSources();

  if (!lists.length) {
    await sendMessage(chatId, "❌ No hay listas.");
    return;
  }

  const keyboard = lists.map((list) => [
    {
      text: `🗑️ ${list.name}`,
      callback_data: `delete_list:${list.name}`,
    },
  ]);

  keyboard.push([
    {
      text: "⬅️ Volver",
      callback_data: "menu_lists",
    },
  ]);

  await sendMessage(chatId, "🗑️ Seleccioná una lista:", {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}
