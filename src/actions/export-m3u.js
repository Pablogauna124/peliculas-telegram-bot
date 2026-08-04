export async function exportChannelsM3u({
  chatId,
  listChannels,
  sendMessage,
}) {
  const channels = await listChannels();

  if (!channels.length) {
    await sendMessage(
      chatId,
      "📺 No hay canales guardados para exportar.",
    );
    return;
  }

  const lines = ["#EXTM3U"];

  for (const channel of channels) {
    if (!channel.active) continue;

    const logo = channel.logo
      ? ` tvg-logo="${channel.logo}"`
      : "";

    const category = channel.category || "General";

    lines.push(
      `#EXTINF:-1${logo} group-title="${category}",${channel.name}`,
    );
    lines.push(channel.url);
  }

  const content = lines.join("\n");

  await sendMessage(
    chatId,
    "✅ <b>Lista M3U generada</b>\n\n" +
      `<b>Canales incluidos:</b> ${channels.filter((channel) => channel.active).length}\n\n` +
      `<pre>${content.slice(0, 3000)}</pre>`,
  );
}
