import { importM3uContent } from "./m3u.js";
import { listM3uSources } from "./m3u-sources.js";
import { supabase } from "./supabase.js";

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
  const startedAt = Date.now();

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

  const durationMs = Date.now() - startedAt;
  const status = result.sourcesFailed > 0 ? "completed_with_errors" : "completed";

  const { error: historyError } = await supabase
    .from("import_history")
    .insert({
      source: "Todas las listas activas",
      status,
      channels: result.channelsTotal,
      new_channels: result.channelsCreated,
      updated_channels: result.channelsUpdated,
      errors: result.channelsFailed + result.sourcesFailed,
      duration_ms: durationMs,
      details: result.details,
    });

  if (historyError) {
    console.error(
      "No se pudo guardar el historial de importación:",
      historyError.message,
    );
  }

  return {
    ...result,
    durationMs,
    status,
  };
}
