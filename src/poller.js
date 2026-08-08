import { deleteWebhook, getUpdates } from "./telegram.js";
import { handleUpdate } from "./handlers.js";
import { logger } from "./logger.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function startLongPolling() {
  let offset = 0;
  let running = true;
  let consecutiveErrors = 0;

  async function prepareTelegram() {
    try {
      await deleteWebhook();
      logger.info("Webhook eliminado. Long polling preparado.");
    } catch (error) {
      logger.warn("deleteWebhook:", error.message);
    }
  }

  async function loop() {
    await prepareTelegram();

    while (running) {
      try {
        const updates = await getUpdates(offset);

        consecutiveErrors = 0;

        for (const update of updates) {
          offset = update.update_id + 1;

          try {
            await handleUpdate(update);
          } catch (error) {
            logger.error(
              "handleUpdate:",
              error.message
            );
          }
        }
      } catch (error) {
        consecutiveErrors++;

        logger.error(
          `getUpdates error #${consecutiveErrors}:`,
          error.message
        );

        // Cada varios errores volvemos a comprobar
        // que Telegram no tenga un webhook activo.
        if (consecutiveErrors % 5 === 0) {
          await prepareTelegram();
        }

        // Espera progresiva, máximo 30 segundos.
        const delay = Math.min(
          3000 * consecutiveErrors,
          30000
        );

        await sleep(delay);
      }
    }
  }

  loop().catch((error) => {
    logger.error(
      "Long polling detenido inesperadamente:",
      error.message
    );

    // Intentar levantar nuevamente el polling.
    if (running) {
      setTimeout(() => {
        loop().catch((restartError) =>
          logger.error(
            "No se pudo reiniciar polling:",
            restartError.message
          )
        );
      }, 5000);
    }
  });

  return () => {
    running = false;
  };
}
