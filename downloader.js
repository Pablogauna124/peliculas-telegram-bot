import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { buildFileUrl, getFile } from "./telegram.js";

async function ensureTmpDir() {
  await fs.mkdir(config.tmpDir, { recursive: true });
}

/**
 * Descarga un video de Telegram a un archivo temporal.
 * Devuelve { localPath, fileName, size, fileInfo }.
 */
export async function downloadVideo(fileId) {
  const fileInfo = await getFile(fileId);

  if (fileInfo.file_size && fileInfo.file_size > config.maxVideoBytes) {
    throw new Error(
      `El video pesa ${(fileInfo.file_size / 1024 / 1024).toFixed(1)} MB y supera el limite permitido.`,
    );
  }

  await ensureTmpDir();

  const extension = path.extname(fileInfo.file_path || "") || ".mp4";
  const fileName = `${randomUUID()}${extension}`;
  const localPath = path.join(config.tmpDir, fileName);

  const response = await fetch(buildFileUrl(fileInfo.file_path));
  if (!response.ok) {
    throw new Error(`No se pudo descargar el video [${response.status}]`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(localPath, buffer);

  return { localPath, fileName, size: buffer.length, fileInfo };
}

export async function removeTempFile(localPath) {
  try {
    await fs.unlink(localPath);
  } catch {
    /* el archivo ya no existe */
  }
}
