import { deleteChannel } from "../channels.js";

export async function confirmDeleteChannel(
  chatId,
  slug,
  sendMessage,
) {
  const channel = await deleteChannel(slug);

  await sendMessage(
    chatId,
    `🗑️ Canal eliminado.\n\n<b>${channel.name}</b>`,
  );
}
