import { deleteM3uSource } from "../m3u-sources.js";

export async function confirmDeleteList(
  chatId,
  name,
  sendMessage,
) {
  const list = await deleteM3uSource(name);

  await sendMessage(
    chatId,
    `🗑️ Lista eliminada.\n\n<b>${list.name}</b>`,
  );
}
