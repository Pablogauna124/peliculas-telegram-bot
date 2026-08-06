import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import {
  getChannelBySlug,
  listChannels,
} from "./channels.js";
import { escapeHtml } from "./utils/html.js";
import { importAllActiveSources } from "./import-service.js";
import { checkChannelById } from "./channel-checker.js";
import { handlePlaylistRoute } from "./routes/playlist.js";
import { renderLayout } from "./pages/layout.js";
import { renderChannelList } from "./pages/channel-list.js";
import { supabase } from "./supabase.js";

import {
  listM3uSources,
} from "./m3u-sources.js";

import {
  getMovieBySlug,
  listMovies,
} from "./movies.js";

import { renderMovieList } from "./pages/movie-list.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.hostname === "youtu.be") {
      const videoId = parts[0];

      return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
        : rawUrl;
    }

    if (url.pathname.startsWith("/embed/")) {
      return rawUrl;
    }

    const videoId = url.searchParams.get("v");

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    if (
      parts[0] === "channel" &&
      parts[1] &&
      parts[2] === "live"
    ) {
      const channelId = parts[1];

      return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(
        channelId,
      )}&autoplay=1`;
    }

    return rawUrl;
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

function renderMoviePlayer(movie) {
  const sourceUrl = String(movie.video_url || "");
  let playerHtml = "";

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();

    if (host.includes("drive.google.com")) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = match?.[1];

      const previewUrl = fileId
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : sourceUrl;

      playerHtml = `
        <iframe
          src="${escapeHtml(previewUrl)}"
          allow="autoplay; fullscreen"
          allowfullscreen
        ></iframe>
      `;
    } else {
      playerHtml = `
        <video
          controls
          playsinline
          preload="metadata"
          src="${escapeHtml(sourceUrl)}"
        ></video>
      `;
    }
  } catch {
    playerHtml = `<div class="message">El enlace de la película no es válido.</div>`;
  }

  return renderLayout(
    movie.title,
    `
      <main class="container">
        <header class="header">
          <div class="brand">Películas <span>PG</span></div>
          <a class="back" href="/peliculas">← Películas</a>
        </header>

        <section class="player-shell">
          ${playerHtml}
        </section>

        <section class="channel-info">
          <h1>${escapeHtml(movie.title)}</h1>
          <div>${escapeHtml(movie.genre || "General")}</div>
          ${
            movie.description
              ? `<p>${escapeHtml(movie.description)}</p>`
              : ""
          }
        </section>
      </main>
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

      if (await handlePlaylistRoute(req, res, pathname)) {
      return;
    }

      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        });

        res.end();
        return;
      }

      if (pathname === "/" || pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          mode: "long-polling",
        });
        return;
      }
            if (pathname === "/api/admin/import/sources") {
        const sources = await listM3uSources();

        sendJson(res, 200, sources);
        return;
      }

      if (
        pathname === "/api/admin/import/all" &&
        req.method === "POST"
      ) {
        const result = await importAllActiveSources();

        sendJson(res, 200, {
          success: true,
          result,
        });

        return;
      }

        if (
        pathname === "/api/admin/import/history" &&
        req.method === "GET"
      ) {
        const { data, error } = await supabase
          .from("import_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          sendJson(res, 500, {
            error: error.message,
          });
          return;
        }

        sendJson(res, 200, data || []);
        return;
      }
      if (
        pathname.startsWith("/api/admin/channels/") &&
        pathname.endsWith("/check") &&
        req.method === "POST"
      ) {
        const channelId = pathname
          .replace("/api/admin/channels/", "")
          .replace("/check", "");

        const channel = await checkChannelById(channelId);

        sendJson(res, 200, {
          success: true,
          channel,
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

            if (
        pathname === "/peliculas" ||
        pathname === "/peliculas/"
      ) {
        const movies = await listMovies();

        const activeMovies = movies.filter(
          (movie) => movie.active,
        );

        sendHtml(
          res,
          200,
          renderMovieList(activeMovies),
        );

        return;
      }

      if (pathname.startsWith("/peliculas/")) {
  const slug = decodeURIComponent(
    pathname.slice("/peliculas/".length),
  );

  const movie = await getMovieBySlug(slug);

  if (!movie) {
    sendHtml(
      res,
      404,
      renderLayout(
        "Película no encontrada",
        `<main class="container">
          <div class="message">La película no existe.</div>
        </main>`,
      ),
    );
    return;
  }

  if (!movie.active) {
    sendHtml(
      res,
      403,
      renderLayout(
        "Película desactivada",
        `<main class="container">
          <div class="message">Esta película está desactivada.</div>
        </main>`,
      ),
    );
    return;
  }

  sendHtml(res, 200, renderMoviePlayer(movie));
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
