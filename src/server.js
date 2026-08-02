import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { getChannelBySlug, listChannels } from "./channels.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify(data));
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });

  res.end(html);
}

function renderLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />

  <title>${escapeHtml(title)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top, #172033 0%, #090b12 45%, #050608 100%);
      color: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .container {
      width: min(1200px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 60px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 32px;
    }

    .brand {
      font-size: 28px;
      font-weight: 800;
    }

    .brand span {
      color: #ef3340;
    }

    .subtitle {
      color: #a8afbf;
      margin-top: 6px;
    }

    .back {
      padding: 10px 15px;
      border: 1px solid #30384b;
      border-radius: 10px;
      background: #111624;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 18px;
    }

    .card {
      overflow: hidden;
      border: 1px solid #252c3d;
      border-radius: 16px;
      background: rgba(18, 22, 34, 0.94);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: #ef3340;
    }

    .logo-box {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 130px;
      padding: 18px;
      background: #0b0e16;
    }

    .logo-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .fallback-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: #ef3340;
      font-size: 30px;
      font-weight: 800;
    }

    .card-body {
      padding: 16px;
    }

    .channel-name {
      margin: 0 0 8px;
      font-size: 18px;
    }

    .category {
      color: #a8afbf;
      font-size: 14px;
    }

    .player-shell {
      overflow: hidden;
      border: 1px solid #252c3d;
      border-radius: 18px;
      background: #000000;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
    }

    video {
      display: block;
      width: 100%;
      max-height: 75vh;
      background: #000000;
    }

    .channel-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 22px;
      padding: 20px;
      border: 1px solid #252c3d;
      border-radius: 16px;
      background: rgba(18, 22, 34, 0.94);
    }

    .channel-info img {
      width: 78px;
      height: 78px;
      object-fit: contain;
      border-radius: 12px;
      background: #ffffff;
    }

    .channel-info h1 {
      margin: 0 0 8px;
      font-size: 26px;
    }

    .status {
      color: #55d98d;
    }

    .message {
      padding: 24px;
      border: 1px solid #3c2f34;
      border-radius: 15px;
      background: #211317;
      color: #ffbac1;
    }

    .external-button {
      display: inline-block;
      margin-top: 18px;
      padding: 12px 18px;
      border-radius: 10px;
      background: #ef3340;
      font-weight: 700;
    }

    @media (max-width: 600px) {
      .container {
        width: min(100% - 20px, 1200px);
        padding-top: 20px;
      }

      .header {
        align-items: flex-start;
      }

      .brand {
        font-size: 23px;
      }

      .channel-info {
        align-items: flex-start;
      }
    }
  </style>
</head>

<body>
  ${content}
</body>
</html>`;
}

function renderChannelList(channels) {
  const cards = channels
    .map((channel) => {
      const logo = channel.logo
        ? `<img
            src="${escapeHtml(channel.logo)}"
            alt="${escapeHtml(channel.name)}"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="fallback-logo" style="display:none;">
            ${escapeHtml(channel.name?.charAt(0) || "TV")}
          </div>`
        : `<div class="fallback-logo">
            ${escapeHtml(channel.name?.charAt(0) || "TV")}
          </div>`;

      return `
        <a class="card" href="/tv/${encodeURIComponent(channel.slug)}">
          <div class="logo-box">
            ${logo}
          </div>

          <div class="card-body">
            <h2 class="channel-name">${escapeHtml(channel.name)}</h2>
            <div class="category">
              ${escapeHtml(channel.category || "General")}
            </div>
          </div>
        </a>
      `;
    })
    .join("");

  return renderLayout(
    "TV en vivo",
    `
    <main class="container">
      <header class="header">
        <div>
          <div class="brand">Películas <span>PG</span></div>
          <div class="subtitle">Canales de televisión en vivo</div>
        </div>
      </header>

      ${
        channels.length
          ? `<section class="grid">${cards}</section>`
          : `<div class="message">Todavía no hay canales activos.</div>`
      }
    </main>
    `,
  );
}

function renderPlayer(channel) {
  const safeName = escapeHtml(channel.name);
  const safeCategory = escapeHtml(channel.category || "General");
  const sourceUrl = JSON.stringify(channel.url);
  const channelType = JSON.stringify(channel.type || "url");

  const logo = channel.logo
    ? `<img src="${escapeHtml(channel.logo)}" alt="${safeName}" />`
    : "";

  return renderLayout(
    channel.name,
    `
    <main class="container">
      <header class="header">
        <div class="brand">Películas <span>PG</span></div>
        <a class="back" href="/tv">← Canales</a>
      </header>

      <section class="player-shell">
        <video
          id="player"
          controls
          playsinline
          preload="metadata"
        ></video>
      </section>

      <div id="player-message"></div>

      <section class="channel-info">
        ${logo}

        <div>
          <h1>${safeName}</h1>
          <div>${safeCategory}</div>
          <div class="status">● Canal activo</div>
        </div>
      </section>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

    <script>
      const player = document.getElementById("player");
      const message = document.getElementById("player-message");

      const sourceUrl = ${sourceUrl};
      const channelType = ${channelType};

      function showMessage(text, includeExternalButton = false) {
        message.innerHTML =
          '<div class="message">' +
          text +
          (includeExternalButton
            ? '<br><a class="external-button" href="' +
              sourceUrl +
              '" target="_blank" rel="noopener noreferrer">Abrir enlace original</a>'
            : '') +
          '</div>';
      }

      function playDirectVideo() {
        player.src = sourceUrl;

        player.addEventListener("error", () => {
          showMessage(
            "El navegador no pudo reproducir este enlace directamente.",
            true,
          );
        });
      }

      if (channelType === "m3u8") {
        if (window.Hls && Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          hls.loadSource(sourceUrl);
          hls.attachMedia(player);

          hls.on(Hls.Events.ERROR, function (_, data) {
            if (data.fatal) {
              showMessage(
                "No se pudo cargar la transmisión. El enlace puede estar vencido, bloqueado o no permitir reproducción externa.",
                true,
              );
            }
          });
        } else if (player.canPlayType("application/vnd.apple.mpegurl")) {
          player.src = sourceUrl;
        } else {
          showMessage(
            "Este navegador no admite reproducción HLS.",
            true,
          );
        }
      } else if (
        channelType === "mp4" ||
        channelType === "webm" ||
        channelType === "ts"
      ) {
        playDirectVideo();
      } else {
        showMessage(
          "Este tipo de enlace no puede reproducirse directamente dentro del navegador.",
          true,
        );
      }
    </script>
    `,
  );
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
        const activeChannels = channels.filter((channel) => channel.active);

        sendHtml(res, 200, renderChannelList(activeChannels));
        return;
      }

      if (pathname.startsWith("/tv/")) {
        const slug = decodeURIComponent(pathname.slice("/tv/".length));
        const channel = await getChannelBySlug(slug);

        if (!channel) {
          sendHtml(
            res,
            404,
            renderLayout(
              "Canal no encontrado",
              `
              <main class="container">
                <div class="message">El canal solicitado no existe.</div>
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
