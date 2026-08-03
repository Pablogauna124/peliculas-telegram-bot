import { createChannel, updateChannelUrl } from "./channels.js";

function cleanValue(value) {
  return String(value || "").trim();
}

function getAttribute(line, attribute) {
  const match = line.match(new RegExp(`${attribute}="([^"]*)"`, "i"));
  return match ? cleanValue(match[1]) : "";
}

function getChannelName(infoLine) {
  const commaIndex = infoLine.indexOf(",");

  if (commaIndex === -1) {
    return "Canal sin nombre";
  }

  return cleanValue(infoLine.slice(commaIndex + 1)) || "Canal sin nombre";
}

export function parseM3u(content) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const channels = [];
  let currentInfo = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      currentInfo = {
        name: getChannelName(line),
        logo: getAttribute(line, "tvg-logo") || null,
        category: getAttribute(line, "group-title") || "General",
      };

      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    if (currentInfo && /^https?:\/\//i.test(line)) {
      channels.push({
        name: currentInfo.name,
        url: line,
        logo: currentInfo.logo,
        category: currentInfo.category,
      });

      currentInfo = null;
    }
  }

  return channels;
}

export async function importM3uContent(content) {
  const parsedChannels = parseM3u(content);

  if (parsedChannels.length === 0) {
    throw new Error("No encontré canales válidos dentro de la lista M3U.");
  }

  const result = {
    total: parsedChannels.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const channel of parsedChannels) {
    try {
      await createChannel(channel);
      result.created += 1;
    } catch (error) {
      const alreadyExists = error.message.includes("Ya existe un canal");

      if (alreadyExists) {
        try {
          await updateChannelUrl(channel.name, channel.url);
          result.updated += 1;
        } catch (updateError) {
          result.failed += 1;
          result.errors.push(`${channel.name}: ${updateError.message}`);
        }
      } else {
        result.failed += 1;
        result.errors.push(`${channel.name}: ${error.message}`);
      }
    }
  }

  return result;
}
export function startHealthServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`,
      );

      const pathname = requestUrl.pathname;

      if (pathname === "/" || pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          mode: "long-polling",
        });
        return;
      }

      if (pathname === "/api/channels") {
        const channels = await listChannels();

        sendJson(
          res,
          200,
          channels.filter((channel) => channel.active),
        );
        return;
      }

      if (pathname === "/tv" || pathname === "/tv/") {
        const channels = await listChannels();
        const activeChannels = channels.filter(
          (channel) => channel.active,
        );

        sendHtml(res, 200, renderChannelList(activeChannels));
        return;
      }

      if (pathname.startsWith("/tv/")) {
        const slug = decodeURIComponent(
          pathname.slice("/tv/".length),
        );

        const channel = await getChannelBySlug(slug);

        if (!channel) {
          sendHtml(
            res,
            404,
            renderLayout(
              "Canal no encontrado",
              `
              <main class="container">
                <div class="message">
                  El canal solicitado no existe.
                </div>
              </main>
              `,
            ),
          );
          return;
        }

        if (!channel.active) {
          sendHtml(
            res,
            403,
            renderLayout(
              "Canal desactivado",
              `
              <main class="container">
                <div class="message">
                  Este canal se encuentra temporalmente desactivado.
                </div>
              </main>
              `,
            ),
          );
          return;
        }

        sendHtml(res, 200, renderPlayer(channel));
        return;
      }

      sendJson(res, 404, {
        error: "not found",
      });
    } catch (error) {
      logger.error("Error HTTP:", error.message);

      sendJson(res, 500, {
        error: "internal server error",
      });
    }
  });

  server.listen(config.port, () => {
    logger.info(`Servidor escuchando en el puerto ${config.port}`);
  });

  return server;
}
