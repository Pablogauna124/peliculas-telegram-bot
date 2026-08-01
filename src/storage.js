import fs from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config.js";
import { logger } from "./logger.js";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToStorage({ localPath, fileName, mimeType }) {
  const body = fs.createReadStream(localPath);

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
      Body: body,
      ContentType: mimeType || "application/octet-stream",
    }),
  );

  const publicUrl =
    `${process.env.R2_PUBLIC_URL.replace(/\/+$/, "")}/${encodeURIComponent(fileName)}`;

  logger.info("Video subido a Cloudflare R2", {
    fileName,
    publicUrl,
  });

  return {
    provider: "cloudflare-r2",
    publicUrl,
  };
}
