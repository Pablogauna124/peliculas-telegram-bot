import { renderLayout } from "./layout.js";
import { escapeHtml } from "../utils/html.js";

export function renderChannelList(channels) {
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
