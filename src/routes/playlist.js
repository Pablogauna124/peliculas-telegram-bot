import { listChannels } from "../channels.js";
import { createM3uPlaylist } from "../services/playlist.js";

export async function handlePlaylistRoute(req, res, pathname) {
  if (
    pathname !== "/playlist.m3u" ||
    req.method !== "GET"
  ) {
    return false;
  }

  const channels = await listChannels();
  const playlist = createM3uPlaylist(channels);

  res.writeHead(200, {
    "Content-Type": "audio/x-mpegurl; charset=utf-8",
    "Content-Disposition": 'inline; filename="playlist.m3u"',
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(playlist);
  return true;
}
