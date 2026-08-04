import { renderLayout } from "./layout.js";
import { escapeHtml } from "../utils/html.js";

export function renderChannelList(channels) {
  const grouped = channels.reduce((acc, channel) => {
    const category = channel.category || "General";

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(channel);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([category, categoryChannels]) => {
      const cards = categoryChannels
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
            <a
              class="card"
              href="/tv/${encodeURIComponent(channel.slug)}"
              data-name="${escapeHtml(channel.name.toLowerCase())}"
              data-category="${escapeHtml(category.toLowerCase())}"
            >
              <div class="logo-box">
                ${logo}
              </div>

              <div class="card-body">
                <h2 class="channel-name">${escapeHtml(channel.name)}</h2>
                <div class="category">
                  ${escapeHtml(category)}
                </div>
              </div>
            </a>
          `;
        })
        .join("");

      return `
        <section class="category-section">
          <h2 class="category-title">${escapeHtml(category)}</h2>

          <div class="category-row">
            ${cards}
          </div>
        </section>
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
          margin-bottom:28px;
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
          ? sections
          : `<div class="message">Todavía no hay canales activos.</div>`
      }
    </main>

    <style>
      .category-section {
        margin-bottom: 34px;
      }

      .category-title {
        margin: 0 0 14px;
        font-size: 22px;
      }

      .category-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 18px;
      }
    </style>

    <script>
      const search = document.getElementById("channel-search");
      const cards = document.querySelectorAll(".card");
      const sections = document.querySelectorAll(".category-section");

      search?.addEventListener("input", () => {
        const value = search.value.trim().toLowerCase();

        cards.forEach((card) => {
          const name = card.dataset.name || "";
          const category = card.dataset.category || "";
          const visible =
            name.includes(value) || category.includes(value);

          card.style.display = visible ? "" : "none";
        });

        sections.forEach((section) => {
          const visibleCards = Array.from(
            section.querySelectorAll(".card"),
          ).some((card) => card.style.display !== "none");

          section.style.display = visibleCards ? "" : "none";
        });
      });
    </script>
    `,
  );
}
