import { importM3uContent } from "./m3u.js";
import { listM3uSources } from "./m3u-sources.js";

async function fetchM3uFromUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept:
          "application/vnd.apple.mpegurl, application/x-mpegURL, text/plain, */*",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `No se pudo descargar la lista [${response.status}]`,
      );
    }

    return response.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La descarga tardó demasiado.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function importAllActiveSources() {
  const sources = await listM3uSources({
    onlyActive: true,
  });

  const result = {
    sourcesTotal: sources.length,
    sourcesProcessed: 0,
    sourcesFailed: 0,
    channelsTotal: 0,
    channelsCreated: 0,
    channelsUpdated: 0,
    channelsFailed: 0,
    details: [],
  };

  for (const source of sources) {
    try {
      const content = await fetchM3uFromUrl(source.url);
      const imported = await importM3uContent(content);

      result.sourcesProcessed += 1;
      result.channelsTotal += imported.total;
      result.channelsCreated += imported.created;
      result.channelsUpdated += imported.updated;
      result.channelsFailed += imported.failed;

      result.details.push({
        sourceId: source.id,
        sourceName: source.name,
        status: "success",
        ...imported,
      });
    } catch (error) {
      result.sourcesFailed += 1;

      result.details.push({
        sourceId: source.id,
        sourceName: source.name,
        status: "error",
        error: error.message,
      });
    }
  }

  return result;
}
