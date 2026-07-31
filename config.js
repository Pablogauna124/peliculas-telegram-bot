import os from "node:os";
import path from "node:path";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "https://example.com/videos").replace(/\/+$/, ""),
  maxVideoBytes: Number(process.env.MAX_VIDEO_MB || 20) * 1024 * 1024,
  tmpDir: path.join(os.tmpdir(), "telegram-videos"),
  pollTimeoutSeconds: 50,
};
