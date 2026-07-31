import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";

/** Render exige un puerto abierto: servidor minimo de health-check. */
export function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", mode: "long-polling" }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(config.port, () => {
    logger.info(`Health server escuchando en el puerto ${config.port}`);
  });

  return server;
}
