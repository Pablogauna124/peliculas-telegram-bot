export async function exportPlaylist(chatId, sendMessage) {
  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL;

  if (!baseUrl) {
    await sendMessage(
      chatId,
      "❌ No está configurada la URL pública del servidor.",
    );
    return;
  }

  await sendMessage(
    chatId,
    "📤 <b>Playlist M3U</b>\n\n" +
      `${baseUrl}/playlist.m3u`,
  );
}
