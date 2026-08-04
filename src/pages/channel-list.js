import { renderLayout } from "./layout.js";
import { escapeHtml } from "../utils/html.js";

export function renderChannelList(channels) {
  const grouped = channels.reduce((acc, channel) => {
    const category = channel.category || "General";

    if (!acc[category]) acc[category] = [];

    acc[category].push(channel);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([category, categoryChannels], sectionIndex) => {
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
              class="channel-card"
              href="/tv/${encodeURIComponent(channel.slug)}"
              data-name="${escapeHtml(channel.name.toLowerCase())}"
              data-category="${escapeHtml(category.toLowerCase())}"
            >
              <div class="channel-logo">
                ${logo}
              </div>

              <div class="channel-info-card">
                <div class="channel-name">${escapeHtml(channel.name)}</div>
              </div>
            </a>
          `;
        })
        .join("");

      return `
        <section class="category-section">
          <div class="category-header">
            <h2>${escapeHtml(category)}</h2>

            <div class="row-controls">
              <button
                type="button"
                onclick="scrollRow('row-${sectionIndex}', -1)"
              >
                ‹
              </button>

              <button
                type="button"
                onclick="scrollRow('row-${sectionIndex}', 1)"
              >
                ›
              </button>
            </div>
          </div>

          <div class="channel-row" id="row-${sectionIndex}">
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
      <header class="hero">
        <div class="hero-overlay">
          <div class="brand">Películas <span>PG</span></div>
          <h1>Televisión en vivo</h1>
          <p>Noticias, deportes, entretenimiento y mucho más.</p>
        </div>
      </header>

      <input
        id="channel-search"
        type="search"
        placeholder="🔍 Buscar canal..."
        class="search-input"
      />

      ${
        channels.length
          ? sections
          : `<div class="message">Todavía no hay canales activos.</div>`
      }
    </main>

    <style>
      .hero {
        min-height: 230px;
        margin-bottom: 26px;
        border-radius: 18px;
        overflow: hidden;
        background:
          linear-gradient(
            90deg,
            rgba(5, 6, 8, 0.95),
            rgba(5, 6, 8, 0.25)
          ),
          radial-gradient(circle at right, #ef3340 0%, #151a27 48%, #080a10 100%);
      }

      .hero-overlay {
        padding: 38px;
      }

      .hero h1 {
        margin: 28px 0 10px;
        font-size: clamp(34px, 5vw, 62px);
      }

      .hero p {
        max-width: 520px;
        color: #c1c7d4;
        font-size: 18px;
      }

      .search-input {
        width: 100%;
        margin-bottom: 30px;
        padding: 15px;
        border-radius: 12px;
        border: 1px solid #30384b;
        background: #111624;
        color: #ffffff;
        font-size: 16px;
        outline: none;
      }

      .category-section {
        margin-bottom: 34px;
      }

      .category-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }

      .category-header h2 {
        margin: 0;
        font-size: 24px;
      }

      .row-controls {
        display: flex;
        gap: 8px;
      }

      .row-controls button {
        width: 40px;
        height: 40px;
        border: 1px solid #30384b;
        border-radius: 50%;
        background: #111624;
        color: #ffffff;
        font-size: 28px;
        cursor: pointer;
      }

      .channel-row {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        scroll-behavior: smooth;
        scrollbar-width: none;
        padding-bottom: 8px;
      }

      .channel-row::-webkit-scrollbar {
        display: none;
      }

      .channel-card {
        flex: 0 0 210px;
        overflow: hidden;
        border: 1px solid #252c3d;
        border-radius: 14px;
        background: #111624;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .channel-card:hover {
        transform: scale(1.04);
        border-color: #ef3340;
      }

      .channel-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 135px;
        padding: 20px;
        background: #090c13;
      }

      .channel-logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .channel-info-card {
        padding: 15px;
      }

      .channel-name {
        font-size: 17px;
        font-weight: 700;
      }

      @media (max-width: 600px) {
        .hero {
          min-height: 190px;
        }

        .hero-overlay {
          padding: 24px;
        }

        .channel-card {
          flex-basis: 165px;
        }

        .channel-logo {
          height: 110px;
        }

        .row-controls {
          display: none;
        }
      }
    </style>

    <script>
      function scrollRow(id, direction) {
        const row = document.getElementById(id);

        row?.scrollBy({
          left: direction * 520,
          behavior: "smooth",
        });
      }

      const search = document.getElementById("channel-search");
      const cards = document.querySelectorAll(".channel-card");
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
            section.querySelectorAll(".channel-card"),
          ).some((card) => card.style.display !== "none");

          section.style.display = visibleCards ? "" : "none";
        });
      });
    </script>
    `,
  );
}
