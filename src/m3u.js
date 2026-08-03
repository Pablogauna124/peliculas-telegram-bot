import { supabase } from "./supabase.js";

const BATCH_SIZE = 100;
const LOOKUP_SIZE = 200;

function cleanValue(value) {
  return String(value || "").trim();
}

function normalizeSlug(value) {
  return cleanValue(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAttribute(line, attribute) {
  const regex = new RegExp(`${attribute}="([^"]*)"`, "i");
  const match = line.match(regex);

  return match ? cleanValue(match[1]) : "";
}

function getChannelName(infoLine) {
  const commaIndex = infoLine.indexOf(",");

  if (commaIndex === -1) {
    return "Canal sin nombre";
  }

  return cleanValue(infoLine.slice(commaIndex + 1)) || "Canal sin nombre";
}

function detectChannelType(url) {
  const value = String(url || "").toLowerCase();

  if (value.includes(".m3u8")) return "m3u8";
  if (value.includes(".m3u")) return "m3u";
  if (value.includes(".mp4")) return "mp4";
  if (value.includes(".webm")) return "webm";
  if (value.includes(".ts")) return "ts";

  return "url";
}

function splitIntoBatches(items, size) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

export function parseM3u(content) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const channels = [];
  let currentInfo = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      currentInfo = {
        name: getChannelName(line),
        logo: getAttribute(line, "tvg-logo") || null,
        category: getAttribute(line, "group-title") || "General",
      };

      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    if (currentInfo && /^https?:\/\//i.test(line)) {
      const slug = normalizeSlug(currentInfo.name);

      if (slug) {
        channels.push({
          name: currentInfo.name,
          slug,
          url: line,
          type: detectChannelType(line),
          logo: currentInfo.logo,
          category: currentInfo.category,
          active: true,
        });
      }

      currentInfo = null;
    }
  }

  /*
   * Evita errores cuando una lista contiene varios canales
   * con exactamente el mismo nombre y slug.
   */
  const uniqueChannels = new Map();

  for (const channel of channels) {
    uniqueChannels.set(channel.slug, channel);
  }

  return Array.from(uniqueChannels.values());
}

async function findExistingSlugs(slugs) {
  const existing = new Set();
  const batches = splitIntoBatches(slugs, LOOKUP_SIZE);

  for (const batch of batches) {
    const { data, error } = await supabase
      .from("channels")
      .select("slug")
      .in("slug", batch);

    if (error) {
      throw new Error(
        `No se pudieron comprobar los canales existentes: ${error.message}`,
      );
    }

    for (const row of data || []) {
      existing.add(row.slug);
    }
  }

  return existing;
}

export async function importM3uContent(content) {
  const parsedChannels = parseM3u(content);

  if (parsedChannels.length === 0) {
    throw new Error(
      "No encontré canales válidos dentro de la lista M3U.",
    );
  }

  const existingSlugs = await findExistingSlugs(
    parsedChannels.map((channel) => channel.slug),
  );

  const result = {
    total: parsedChannels.length,
    created: parsedChannels.filter(
      (channel) => !existingSlugs.has(channel.slug),
    ).length,
    updated: parsedChannels.filter(
      (channel) => existingSlugs.has(channel.slug),
    ).length,
    failed: 0,
    errors: [],
  };

  const batches = splitIntoBatches(parsedChannels, BATCH_SIZE);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];

    const { error } = await supabase
      .from("channels")
      .upsert(batch, {
        onConflict: "slug",
        ignoreDuplicates: false,
      });

    if (error) {
      result.failed += batch.length;
      result.errors.push(
        `Lote ${index + 1}: ${error.message}`,
      );
    }
  }

  return result;
}
