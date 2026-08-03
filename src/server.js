import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import {
  getChannelBySlug,
  listChannels,
} from "./channels.js";

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
    }

    video,
    iframe {
      display: block;
      width: 100%;
      min-height: 240px;
      border: 0;
      background: #000000;
    }

    video {
      max-height: 75vh;
    }

    iframe {
      height: min(70vh, 720px);
    }

    .channel-info {
      margin-top: 22px;
      padding: 20px;
      border: 1px solid #252c3d;
      border-radius: 16px;
      background: rgba(18, 22, 34, 0.94);
    }

    .message {
      margin-top: 18px;
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

      .brand {
        font-size: 23px;
      }

      iframe {
        height: 56.25vw;
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

function getProviderType(rawUrl, channelType) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (channelType === "m3u8") return "hls";
    if (["mp4", "webm", "ts"].includes(channelType)) return "video";
    if (channelType === "m3u") return "m3u";

    if (host === "youtu.be" || host.includes("youtube.com")) {
      return "youtube";
    }

    if (host.includes("vimeo.com")) {
      return "vimeo";
    }

    if (host.includes("dailymotion.com")) {
      return "dailymotion";
    }

    if (
      host === "video.ibm.com" ||
      host.endsWith(".video.ibm.com") ||
      host === "ustream.tv" ||
      host.endsWith(".ustream.tv")
    ) {
      return "external";
    }

    return "external";
  } catch {
    return "external";
  }
}

function buildEmbedUrl(rawUrl, providerType) {
  const url = new URL(rawUrl);

  if (providerType === "youtube") {
    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : rawUrl;
    }

    if (url.pathname.startsWith("/embed/")) {
      return rawUrl;
    }

    const videoId = url.searchParams.get("v");
    return videoId
      ? `https://www.youtube.com/embed/${videoId}`
      : rawUrl;
  }

  if (providerType === "vimeo") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];

    return videoId
      ? `https://player.vimeo.com/video/${videoId}`
      : rawUrl;
  }

  if (providerType === "dailymotion") {
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.indexOf("video");
    const videoId = index >= 0 ? parts[index + 1] : null;

    return videoId
      ? `https://www.dailymotion.com/embed/video/${videoId}`
      : rawUrl;
  }

  return rawUrl;
}
function renderPlayer(channel) {
  const safeName = escapeHtml(channel.name);
  const safeCategory = escapeHtml(channel.category || "General");
  const sourceUrl = channel.url;
  const providerType = getProviderType(
    sourceUrl,
    channel.type || "url",
  );

  const safeSourceUrl = escapeHtml(sourceUrl);
  const sourceUrlJson = JSON.stringify(sourceUrl);
  const providerTypeJson = JSON.stringify(providerType);

  let playerHtml = "";

  if (
    providerType === "youtube" ||
    providerType === "vimeo" ||
    providerType === "dailymotion"
  ) {
    const embedUrl = buildEmbedUrl(sourceUrl, providerType);

    playerHtml = `
      <iframe
        src="${escapeHtml(embedUrl)}"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    `;
  } else if (providerType === "external") {
    playerHtml = `
      <div class="message">
        Este proveedor no permite reproducir el contenido dentro de esta página.

        <br />

        <a
          class="external-button"
          href="${safeSourceUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir transmisión
        </a>
      </div>
    `;
  } else if (providerType === "m3u") {
    playerHtml = `
      <div class="message">
        Este enlace es una lista M3U. Primero debe importarse para seleccionar sus canales.

        <br />

        <a
          class="external-button"
          href="${safeSourceUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir enlace original
        </a>
      </div>
    `;
  } else {
    playerHtml = `
      <video
        id="video-player"
        controls
        playsinline
        preload="metadata"
      ></video>

      <div id="player-message"></div>
    `;
  }

  return renderLayout(
    channel.name,
    `
    <main class="container">
      <header class="header">
        <div class="brand">Películas <span>PG</span></div>
        <a class="back" href="/tv">← Canales</a>
      </header>

      <section class="player-shell">
        ${playerHtml}
      </section>

      <section class="channel-info">
        <h1>${safeName}</h1>
        <div>${safeCategory}</div>
        <div style="color:#55d98d;">● Canal activo</div>
      </section>
    </main>

    ${
      providerType === "hls" || providerType === "video"
        ? `
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

    <script>
      const player = document.getElementById("video-player");
      const message = document.getElementById("player-message");

      const sourceUrl = ${sourceUrlJson};
      const providerType = ${providerTypeJson};

      function showError(text) {
        message.innerHTML =
          '<div class="message">' +
          text +
          '<br><a class="external-button" href="' +
          sourceUrl +
          '" target="_blank" rel="noopener noreferrer">' +
          'Abrir enlace original</a></div>';
      }

      if (providerType === "hls") {
        if (window.Hls && Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          hls.loadSource(sourceUrl);
          hls.attachMedia(player);

          hls.on(Hls.Events.ERROR, function (_, data) {
            if (data.fatal) {
              showError(
                "No se pudo cargar la transmisión. El enlace puede estar vencido, bloqueado o no permitir reproducción externa.",
              );
            }
          });
        } else if (
          player.canPlayType("application/vnd.apple.mpegurl")
        ) {
          player.src = sourceUrl;
        } else {
          showError(
            "Este navegador no admite reproducción HLS.",
          );
        }
      } else {
        player.src = sourceUrl;

        player.addEventListener(
          "error",
          () => {
            showError(
              "El navegador no pudo reproducir este enlace directamente.",
            );
          },
          { once: true },
        );
      }
    </script>
    `
        : ""
    }
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
