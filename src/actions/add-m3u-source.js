export async function startAddM3uSource({
  chatId,
  sessions,
  sendMessage,
}) {
  sessions.set(chatId, {
    action: "add-m3u-source",
    step: "name",
    data: {},
  });

  await sendMessage(
    chatId,
    "📥 <b>Nueva lista M3U</b>\n\nEnviame el nombre de la lista.",
  );
}

export async function processAddM3uSource({
  chatId,
  text,
  sessions,
  sendMessage,
  addM3uSource,
  isValidUrl,
  escapeHtml,
}) {
  const session = sessions.get(chatId);

  if (!session || session.action !== "add-m3u-source") {
    return false;
  }

  if (session.step === "name") {
    session.data.name = text.trim();
    session.step = "url";

    await sendMessage(
      chatId,
      "🔗 Ahora enviame la URL pública de la lista M3U.",
    );

    return true;
  }

  if (session.step === "url") {
    if (!isValidUrl(text)) {
      await sendMessage(
        chatId,
        "❌ La URL no es válida. Intentá nuevamente.",
      );

      return true;
    }

    const source = await addM3uSource(
      session.data.name,
      text.trim(),
    );

    sessions.delete(chatId);

    await sendMessage(
      chatId,
      "✅ <b>Lista guardada correctamente</b>\n\n" +
        `<b>Nombre:</b> ${escapeHtml(source.name)}\n` +
        `<b>URL:</b> ${escapeHtml(source.url)}`,
    );

    return true;
  }

  return false;
}
