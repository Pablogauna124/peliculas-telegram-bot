import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { getChannelBySlug } from "./channels.js";

export function startHealthServer() {
  const server = http.createServer(async (req, res) => {
    try {
      // Health Check
      if (req.url === "/" || req.url === "/health") {
        res.writeHead(200, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            status: "ok",
            mode: "long-polling",
          }),
        );

        return;
      }

      // /tv/canal-slug
      if (req.url.startsWith("/tv/")) {
        const slug = decodeURIComponent(req.url.replace("/tv/", ""));

        const channel = await getChannelBySlug(slug);

        if (!channel) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              error: "Canal no encontrado",
            }),
          );

          return;
        }

        if (!channel.active) {
          res.writeHead(403, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              error: "Canal desactivado",
            }),
          );

          return;
        }

        res.writeHead(302, {
          Location: channel.url,
        });

        res.end();

        return;
      }

      res.writeHead(404, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "not found",
        }),
      );
    } catch (error) {
      logger.error(error);

      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: error.message,
        }),
      );
    }
  });

  server.listen(config.port, () => {
    logger.info(`Health server escuchando en el puerto ${config.port}`);
  });

  return server;
}
