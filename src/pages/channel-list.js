import { renderLayout } from "./layout.js";
import { escapeHtml } from "../utils/html.js";

function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function renderChannelList(channels) {
  const safeChannels = channels.map((channel) => ({
    name: String(channel.name || "Canal"),
    slug: String(channel.slug || ""),
    url: String(channel.url || ""),
    type: String(channel.type || "url"),
    category: String(channel.category || "General"),
    logo: channel.logo ? String(channel.logo) : null,
  }));

  const items = safeChannels
    .map((channel, index) => {
      const logo = channel.logo
        ? `<img src="${escapeHtml(channel.logo)}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
           <span class="list-fallback" style="display:none">${escapeHtml(channel.name.charAt(0) || "TV")}</span>`
        : `<span class="list-fallback">${escapeHtml(channel.name.charAt(0) || "TV")}</span>`;

      return `
        <button
          class="channel-item"
          type="button"
          data-index="${index}"
          data-search="${escapeHtml(`${channel.name} ${channel.category}`.toLowerCase())}"
        >
          <span class="list-logo">${logo}</span>
          <span class="list-text">
            <strong>${escapeHtml(channel.name)}</strong>
            <small>${escapeHtml(channel.category)}</small>
          </span>
          <span class="live-dot">â—</span>
        </button>`;
    })
    .join("");

  return renderLayout(
    "PG Streaming Â· TV en vivo",
    `
    <main class="tv-app">
      <header class="tv-header">
        <div>
          <div class="brand">PG <span>Streaming</span></div>
          <div class="tv-subtitle">TelevisiÃ³n en vivo</div>
        </div>
        <a class="movies-button" href="/peliculas">ðŸŽ¬ PelÃ­culas</a>
      </header>

      ${
        safeChannels.length
          ? `
          <section class="tv-layout">
            <div class="watch-area">
              <div id="dynamic-player" class="dynamic-player">
                <div class="player-placeholder">ElegÃ­ un canal para comenzar</div>
              </div>

              <div class="now-playing">
                <div>
                  <small>REPRODUCIENDO AHORA</small>
                  <h1 id="current-name">SeleccionÃ¡ un canal</h1>
                  <p id="current-category">TV en vivo</p>
                </div>
                <div class="nav-buttons">
                  <button id="previous-channel" type="button" aria-label="Canal anterior">â€¹</button>
                  <button id="next-channel" type="button" aria-label="Canal siguiente">â€º</button>
                </div>
              </div>
            </div>

            <aside class="channel-sidebar">
              <div class="sidebar-title">
                <strong>Canales</strong>
                <span>${safeChannels.length}</span>
              </div>
              <input id="channel-search" type="search" placeholder="ðŸ” Buscar canal..." />
              <div id="channel-list" class="channel-list">${items}</div>
            </aside>
          </section>`
          : `<div class="message">TodavÃ­a no hay canales activos.</div>`
      }
    </main>

    <style>
      .tv-app { width:min(1500px,calc(100% - 28px)); margin:auto; padding:22px 0 40px; }
      .tv-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
      .tv-subtitle { color:#a8afbf; margin-top:5px; }
      .movies-button { padding:11px 15px; border:1px solid #30384b; border-radius:10px; background:#111624; }
      .tv-layout { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:18px; align-items:start; }
      .watch-area,.channel-sidebar { border:1px solid #252c3d; border-radius:18px; background:#0d111c; overflow:hidden; }
      .dynamic-player { position:relative; width:100%; aspect-ratio:16/9; background:#000; }
      .dynamic-player video,.dynamic-player iframe { width:100%; height:100%; min-height:0; border:0; background:#000; }
      .player-placeholder { height:100%; display:flex; align-items:center; justify-content:center; color:#8f98aa; padding:30px; text-align:center; }
      .player-error { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px; color:#ffbac1; text-align:center; }
      .player-error a { margin-top:16px; padding:11px 16px; border-radius:9px; background:#ef3340; color:#fff; font-weight:700; }
      .now-playing { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px; }
      .now-playing small { color:#55d98d; font-size:11px; font-weight:800; }
      .now-playing h1 { margin:6px 0 3px; font-size:25px; }
      .now-playing p { margin:0; color:#a8afbf; }
      .nav-buttons { display:flex; gap:8px; }
      .nav-buttons button { width:42px; height:42px; border:1px solid #30384b; border-radius:50%; background:#111624; color:#fff; font-size:28px; cursor:pointer; }
      .channel-sidebar { max-height:calc(100vh - 115px); position:sticky; top:15px; }
      .sidebar-title { display:flex; justify-content:space-between; padding:16px 16px 9px; }
      .sidebar-title span { color:#a8afbf; }
      #channel-search { width:calc(100% - 24px); margin:4px 12px 12px; padding:12px; border:1px solid #30384b; border-radius:10px; background:#111624; color:#fff; outline:none; }
      .channel-list { max-height:calc(100vh - 220px); overflow-y:auto; padding:0 8px 10px; }
      .channel-item { width:100%; display:flex; align-items:center; gap:11px; padding:10px; border:1px solid transparent; border-radius:11px; background:transparent; color:#fff; text-align:left; cursor:pointer; }
      .channel-item:hover { background:#151b2a; }
      .channel-item.active { border-color:#ef3340; background:#1a1720; }
      .list-logo { width:52px; height:40px; flex:none; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:8px; background:#080b11; }
      .list-logo img { width:100%; height:100%; object-fit:contain; }
      .list-fallback { width:30px; height:30px; align-items:center; justify-content:center; border-radius:50%; background:#ef3340; font-weight:800; }
      .list-text { min-width:0; flex:1; display:flex; flex-direction:column; gap:4px; }
      .list-text strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .list-text small { color:#a8afbf; }
      .live-dot { color:#55d98d; font-size:11px; }
      @media(max-width:850px) {
        .tv-layout { grid-template-columns:1fr; }
        .channel-sidebar { position:static; max-height:none; }
        .channel-list { max-height:430px; }
      }
      @media(max-width:600px) {
        .tv-app { width:100%; padding:14px 10px 30px; }
        .tv-header { padding:0 3px; }
        .movies-button { font-size:13px; padding:9px 11px; }
        .now-playing h1 { font-size:20px; }
        .now-playing { padding:14px; }
      }
    </style>

    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script>
      const channels = ${serializeForScript(safeChannels)};
      const stage = document.getElementById("dynamic-player");
      const nameElement = document.getElementById("current-name");
      const categoryElement = document.getElementById("current-category");
      const items = Array.from(document.querySelectorAll(".channel-item"));
      let currentIndex = -1;
      let currentHls = null;

      function escapeText(value) {
        const div = document.createElement("div");
        div.textContent = String(value || "");
        return div.innerHTML;
      }

      function provider(channel) {
        const type = String(channel.type || "url").toLowerCase();
        if (type === "m3u8") return "hls";
        if (["mp4", "webm", "ts"].includes(type)) return "video";
        if (type === "m3u") return "m3u";
        try {
          const host = new URL(channel.url).hostname.toLowerCase();
          if (host === "youtu.be" || host.includes("youtube.com")) return "youtube";
          if (host.includes("vimeo.com")) return "vimeo";
          if (host.includes("dailymotion.com")) return "dailymotion";
          if (host === "video.ibm.com" || host.endsWith(".video.ibm.com")) return "ibm";
        } catch {}
        return "external";
      }

      function embedUrl(rawUrl, type) {
        const url = new URL(rawUrl);
        const parts = url.pathname.split("/").filter(Boolean);
        if (type === "youtube") {
          if (url.hostname === "youtu.be") return "https://www.youtube.com/embed/" + parts[0] + "?autoplay=1";
          if (url.pathname.startsWith("/embed/")) return rawUrl;
          const videoId = url.searchParams.get("v");
          if (videoId) return "https://www.youtube.com/embed/" + videoId + "?autoplay=1";
          if (parts[0] === "channel" && parts[1] && parts[2] === "live") {
            return "https://www.youtube.com/embed/live_stream?channel=" + encodeURIComponent(parts[1]) + "&autoplay=1";
          }
        }
        if (type === "vimeo") return "https://player.vimeo.com/video/" + parts[0];
        if (type === "dailymotion") {
          const index = parts.indexOf("video");
          return index >= 0 ? "https://www.dailymotion.com/embed/video/" + parts[index + 1] : rawUrl;
        }
        if (type === "ibm") {
          const index = parts.indexOf("channel");
          return index >= 0 ? "https://video.ibm.com/embed/" + encodeURIComponent(parts[index + 1]) : rawUrl;
        }
        return rawUrl;
      }

      function clearPlayer() {
        if (currentHls) { currentHls.destroy(); currentHls = null; }
        stage.replaceChildren();
      }

      function showError(channel, text) {
        stage.innerHTML = '<div class="player-error"><div>' + escapeText(text) + '</div><a target="_blank" rel="noopener noreferrer">Abrir transmisiÃ³n</a></div>';
        stage.querySelector("a").href = channel.url;
      }

      function selectChannel(index) {
        const channel = channels[index];
        if (!channel) return;
        clearPlayer();
        currentIndex = index;
        nameElement.textContent = channel.name;
        categoryElement.textContent = channel.category;
        items.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index));
        items[index]?.scrollIntoView({ block:"nearest", behavior:"smooth" });
        history.replaceState(null, "", "/tv?canal=" + encodeURIComponent(channel.slug));

        const type = provider(channel);
        if (["youtube", "vimeo", "dailymotion", "ibm"].includes(type)) {
          const iframe = document.createElement("iframe");
          iframe.src = embedUrl(channel.url, type);
          iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
          iframe.allowFullscreen = true;
          stage.appendChild(iframe);
          return;
        }
        if (type === "external" || type === "m3u") {
          showError(channel, type === "m3u" ? "Este enlace es una lista M3U." : "Este proveedor debe abrirse en su pÃ¡gina original.");
          return;
        }

        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.autoplay = true;
        stage.appendChild(video);

        if (type === "hls" && window.Hls && Hls.isSupported()) {
          currentHls = new Hls({ enableWorker:true, lowLatencyMode:true });
          currentHls.loadSource(channel.url);
          currentHls.attachMedia(video);
          currentHls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) { clearPlayer(); showError(channel, "No se pudo cargar la transmisiÃ³n."); }
          });
        } else if (type === "hls" && video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = channel.url;
        } else {
          video.src = channel.url;
        }
        video.play().catch(() => {});
      }

      items.forEach((item) => item.addEventListener("click", () => selectChannel(Number(item.dataset.index))));
      document.getElementById("previous-channel")?.addEventListener("click", () => selectChannel((currentIndex - 1 + channels.length) % channels.length));
      document.getElementById("next-channel")?.addEventListener("click", () => selectChannel((currentIndex + 1) % channels.length));
      document.getElementById("channel-search")?.addEventListener("input", (event) => {
        const value = event.target.value.trim().toLowerCase();
        items.forEach((item) => { item.style.display = item.dataset.search.includes(value) ? "" : "none"; });
      });

      const requestedSlug = new URLSearchParams(location.search).get("canal");
      const initialIndex = Math.max(0, channels.findIndex((channel) => channel.slug === requestedSlug));
      if (channels.length) selectChannel(initialIndex);
    </script>
    `,
  );
}
