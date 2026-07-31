import { config } from "./config.js";
import { logger } from "./logger.js";

/**
 * Punto de extension: sube el archivo local a un almacenamiento externo
 * (S3, Cloudflare R2, Supabase Storage, Bunny, etc.) y devuelve la URL publica.
 *
 * Implementacion actual: placeholder que solo construye la URL final a partir
 * de PUBLIC_BASE_URL. Sustituye el cuerpo por la llamada real del proveedor.
 *
 * Ejemplo con URL firmada:
 *   const { url } = await fetch(signEndpoint, { ... }).then((r) => r.json());
 *   await fetch(url, { method: "PUT", body: await fs.readFile(localPath) });
 *
 * @param {{ localPath: string, fileName: string, mimeType?: string }} input
 * @returns {Promise<{ publicUrl: string, provider: string }>}
 */
export async function uploadToStorage({ localPath, fileName, mimeType }) {
  logger.info("Subida pendiente de implementar", { localPath, fileName, mimeType });

  return {
    provider: "placeholder",
    publicUrl: `${config.publicBaseUrl}/${encodeURIComponent(fileName)}`,
  };
}
