import { supabase } from "./supabase.js";

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Range: "bytes=0-1024",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    return {
      online: response.ok || response.status === 206,
      error: response.ok || response.status === 206
        ? null
        : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      online: false,
      error:
        error.name === "AbortError"
          ? "Tiempo de espera agotado"
          : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkChannelById(channelId) {
  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("id, name, url")
    .eq("id", channelId)
    .maybeSingle();

  if (channelError) {
    throw new Error(channelError.message);
  }

  if (!channel) {
    throw new Error("Canal no encontrado.");
  }

  const result = await checkUrl(channel.url);

  const { data, error } = await supabase
    .from("channels")
    .update({
      online: result.online,
      last_check: new Date().toISOString(),
      check_error: result.error,
    })
    .eq("id", channel.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
