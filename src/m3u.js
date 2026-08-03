import {
  createChannel,
  updateChannelUrl,
} from "./channels.js";

function cleanValue(value) {
  return String(value || "").trim();
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
      channels.push({
        name: currentInfo.name,
        url: line,
        logo: currentInfo.logo,
        category: currentInfo.category,
      });

      currentInfo = null;
    }
  }

  return channels;
}

export async function importM3uContent(content) {
  const parsedChannels = parseM3u(content);

  if (parsedChannels.length === 0) {
    throw new Error(
      "No encontré canales válidos dentro de la lista M3U.",
    );
  }

  const result = {
    total: parsedChannels.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const channel of parsedChannels) {
    try {
      await createChannel(channel);
      result.created += 1;
    } catch (error) {
      const alreadyExists =
        error.message.includes("Ya existe un canal");

      if (alreadyExists) {
        try {
          await updateChannelUrl(channel.name, channel.url);
          result.updated += 1;
        } catch (updateError) {
          result.failed += 1;
          result.errors.push(
            `${channel.name}: ${updateError.message}`,
          );
        }
      } else {
        result.failed += 1;
        result.errors.push(
          `${channel.name}: ${error.message}`,
        );
      }
    }
  }

  return result;
}
