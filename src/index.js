import "dotenv/config";
import { startHealthServer } from "./server.js";
import { startLongPolling } from "./poller.js";
import { getMe } from "./telegram.js";
import { logger } from "./logger.js";

async function main() {
  const me = await getMe();
  logger.info(`Bot conectado como @${me.username}`);

  const server = startHealthServer();
  const stopPolling = startLongPolling();

  const shutdown = () => {
    logger.info("Cerrando...");
    stopPolling();
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  logger.error("Fallo al iniciar:", error.message);
  process.exit(1);
});