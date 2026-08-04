import { listChannels } from "../channels.js";

export async function showDeleteChannelMenu(chatId, sendMessage) {
  const channels = await listChannels();

  if (!channels.length) {
    await sendMessage(chatId, "❌ No hay canales.");
    return;
  }

  const keyboard = channels.map((channel) => [
    {
      text: `🗑️ ${channel.name}`,
      callback_data: `delete_channel:${channel.slug}`,
    },
  ]);

  keyboard.push([
    {
      text: "⬅️ Volver",
      callback_data: "menu_channels",
    },
  ]);

  await sendMessage(chatId, "🗑️ Seleccioná un canal:", {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}
