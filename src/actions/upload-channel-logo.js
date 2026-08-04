import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function processChannelLogoPhoto({
  chatId,
  message,
  sessions,
  getFile,
  buildFileUrl,
  uploadToStorage,
  createChannel,
  sendMessage,
}) {
  const session = sessions.get(chatId);

  if (
    !session ||
    session.action !== "create-channel" ||
    session.step !== "logo" ||
    !message.photo?.length
  ) {
    return false;
  }

  const photo = message.photo.at(-1);
  const fileInfo = await getFile(photo.file_id);
  const fileUrl = buildFileUrl(fileInfo.file_path);

  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error("No se pudo descargar la imagen desde Telegram.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = `logo-${Date.now()}.jpg`;
  const localPath = path.join(os.tmpdir(), fileName);

  await fs.writeFile(localPath, buffer);

  try {
    const uploaded = await uploadToStorage({
      localPath,
      fileName,
      mimeType: "image/jpeg",
    });

    const channel = await createChannel({
      name: session.data.name,
      url: session.data.url,
      category: session.data.category,
      logo: uploaded.publicUrl,
    });

    sessions.delete(chatId);

    await sendMessage(
      chatId,
      "✅ <b>Canal creado correctamente</b>\n\n" +
        `<b>Nombre:</b> ${channel.name}\n` +
        "🖼️ Logo subido desde Telegram.",
    );

    return true;
  } finally {
    await fs.rm(localPath, { force: true });
  }
}
