import { renderLayout } from "./layout.js";
import { escapeHtml } from "../utils/html.js";

export function renderMovieList(movies) {
  const cards = movies
    .map((movie) => {
      const poster = movie.poster_url
        ? `
          <img
            src="${escapeHtml(movie.poster_url)}"
            alt="${escapeHtml(movie.title)}"
            loading="lazy"
            onerror="this.style.display='none';"
          />
        `
        : `
          <div class="poster-fallback">
            🎬
          </div>
        `;

      return `
        <a
          class="movie-card"
          href="/peliculas/${encodeURIComponent(movie.slug)}"
          data-search="${escapeHtml(
            `${movie.title} ${movie.genre || ""}`.toLowerCase(),
          )}"
        >
          <div class="movie-poster">
            ${poster}

            ${
              movie.featured
                ? `<span class="featured-badge">DESTACADA</span>`
                : ""
            }
          </div>

          <div class="movie-details">
            <div class="movie-title">
              ${escapeHtml(movie.title)}
            </div>

            <div class="movie-meta">
              ${escapeHtml(movie.genre || "General")}
              ${
                movie.release_year
                  ? ` · ${escapeHtml(movie.release_year)}`
                  : ""
              }
            </div>
          </div>
        </a>
      `;
    })
    .join("");

  return renderLayout(
    "Películas",
    `
    <main class="container">
      <header class="movies-header">
        <div>
          <div class="brand">Películas <span>PG</span></div>
          <h1>Catálogo de películas</h1>
          <p>Elegí una película y comenzá a verla.</p>
        </div>

        <a class="tv-button" href="/tv">
          📺 TV en vivo
        </a>
      </header>

      <input
        id="movie-search"
        class="movie-search"
        type="search"
        placeholder="🔍 Buscar película o género..."
      />

      ${
        movies.length
          ? `<section class="movie-grid">${cards}</section>`
          : `<div class="message">Todavía no hay películas disponibles.</div>`
      }
    </main>

    <style>
      .movies-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 28px;
      }

      .movies-header h1 {
        margin: 28px 0 8px;
        font-size: clamp(32px, 5vw, 58px);
      }

      .movies-header p {
        margin: 0;
        color: #aeb6c7;
        font-size: 18px;
      }

      .tv-button {
        padding: 13px 18px;
        border: 1px solid #30384b;
        border-radius: 12px;
        background: #111624;
        color: #ffffff;
        white-space: nowrap;
      }

      .movie-search {
        width: 100%;
        margin-bottom: 28px;
        padding: 15px;
        border: 1px solid #30384b;
        border-radius: 12px;
        background: #111624;
        color: #ffffff;
        font-size: 16px;
        outline: none;
      }

      .movie-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fill, minmax(180px, 1fr));
        gap: 20px;
      }

      .movie-card {
        overflow: hidden;
        border: 1px solid #252c3d;
        border-radius: 15px;
        background: #111624;
        color: #ffffff;
        transition:
          transform 0.2s ease,
          border-color 0.2s ease;
      }

      .movie-card:hover {
        transform: translateY(-5px);
        border-color: #ef3340;
      }

      .movie-poster {
        position: relative;
        aspect-ratio: 2 / 3;
        overflow: hidden;
        background: #090c13;
      }

      .movie-poster img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .poster-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        font-size: 64px;
      }

      .featured-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 5px 8px;
        border-radius: 6px;
        background: #ef3340;
        font-size: 10px;
        font-weight: 800;
      }

      .movie-details {
        padding: 14px;
      }

      .movie-title {
        overflow: hidden;
        font-size: 17px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .movie-meta {
        margin-top: 7px;
        color: #aeb6c7;
        font-size: 13px;
      }

      @media (max-width: 600px) {
        .movies-header {
          flex-direction: column;
        }

        .movie-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 13px;
        }
      }
    </style>

    <script>
      const movieSearch =
        document.getElementById("movie-search");

      const movieCards =
        document.querySelectorAll(".movie-card");

      movieSearch?.addEventListener("input", () => {
        const value =
          movieSearch.value.trim().toLowerCase();

        movieCards.forEach((card) => {
          const search = card.dataset.search || "";

          card.style.display =
            search.includes(value) ? "" : "none";
        });
      });
    </script>
    `,
  );
}
