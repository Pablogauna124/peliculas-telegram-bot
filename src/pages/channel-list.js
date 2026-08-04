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

      <input
        id="channel-search"
        type="search"
        placeholder="🔍 Buscar canal..."
        style="
          width:100%;
          margin-bottom:20px;
          padding:14px;
          border-radius:10px;
          border:1px solid #30384b;
          background:#111624;
          color:#fff;
          font-size:16px;
          outline:none;
        "
      />

      ${
        channels.length
          ? `<section class="grid">${cards}</section>`
          : `<div class="message">Todavía no hay canales activos.</div>`
      }
    </main>

    <script>
      const search = document.getElementById("channel-search");
      const cards = document.querySelectorAll(".card");

      search?.addEventListener("input", () => {
        const value = search.value.toLowerCase();

        cards.forEach((card) => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(value) ? "" : "none";
        });
      });
    </script>
    `,
  );
}
