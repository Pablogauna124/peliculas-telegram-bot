function cleanM3uValue(value) {
  return String(value ?? "")
    .replaceAll('"', "'")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .trim();
}

export function createM3uPlaylist(channels) {
  const lines = ["#EXTM3U"];

  for (const channel of channels) {
    if (!channel.active || !channel.url) continue;

    const name = cleanM3uValue(channel.name || "Canal");
    const category = cleanM3uValue(
      channel.category || "General",
    );
    const logo = cleanM3uValue(channel.logo || "");

    lines.push(
      `#EXTINF:-1 tvg-logo="${logo}" group-title="${category}",${name}`,
    );

    lines.push(String(channel.url).trim());
  }

  return `${lines.join("\n")}\n`;
}
