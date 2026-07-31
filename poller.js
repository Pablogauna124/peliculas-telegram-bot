import { deleteWebhook, getUpdates } from "./telegram.js";
import { handleUpdate } from "./handlers.js";
import { logger } from "./logger.js";

export function startLongPolling() {
  let offset = 0;
  let running = true;

  async function loop() {
    // getUpdates no funciona si hay un webhook activo.
    await deleteWebhook().catch((error) => logger.warn("deleteWebhook:", error.message));

    while (running) {
      try {
        const updates = await getUpdates(offset);
        for (const update of updates) {
          offset = update.update_id + 1;
          handleUpdate(update).catch((error) =>
            logger.error("handleUpdate:", error.message),
          );
        }
      } catch (error) {
        logger.error("getUpdates:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  loop();

  return () => {
    running = false;
  };
}
