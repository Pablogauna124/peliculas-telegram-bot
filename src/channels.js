import { supabase } from "./supabase.js";

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function detectChannelType(url) {
  const value = String(url || "").toLowerCase();

  if (value.includes(".m3u8")) return "m3u8";
  if (value.includes(".m3u")) return "m3u";
  if (value.includes(".mp4")) return "mp4";
  if (value.includes(".webm")) return "webm";
  if (value.includes(".ts")) return "ts";

  return "url";
}

export async function createChannel({
  name,
  url,
  category = "General",
  logo = null,
}) {
  const slug = normalizeSlug(name);

  if (!name?.trim()) {
    throw new Error("El nombre del canal es obligatorio.");
  }

  if (!url?.trim()) {
    throw new Error("El enlace del canal es obligatorio.");
  }

  const { data: existing, error: searchError } = await supabase
    .from("channels")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (searchError) {
    throw new Error(`No se pudo comprobar el canal: ${searchError.message}`);
  }

  if (existing) {
    throw new Error(`Ya existe un canal con el identificador ${slug}.`);
  }

  const { data, error } = await supabase
    .from("channels")
    .insert({
      name: name.trim(),
      slug,
      url: url.trim(),
      type: detectChannelType(url),
      logo: logo?.trim() || null,
      category: category?.trim() || "General",
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo crear el canal: ${error.message}`);
  }

  return data;
}

export async function listChannels() {
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron listar los canales: ${error.message}`);
  }

  return data || [];
}

export async function getChannelBySlug(slug) {
  const normalized = normalizeSlug(slug);

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo buscar el canal: ${error.message}`);
  }

  return data;
}

export async function updateChannelUrl(slug, newUrl) {
  const normalized = normalizeSlug(slug);

  if (!newUrl?.trim()) {
    throw new Error("El nuevo enlace es obligatorio.");
  }

  const { data, error } = await supabase
    .from("channels")
    .update({
      url: newUrl.trim(),
      type: detectChannelType(newUrl),
    })
    .eq("slug", normalized)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo actualizar el canal: ${error.message}`);
  }

  if (!data) {
    throw new Error("No encontré ese canal.");
  }

  return data;
}

export async function deleteChannel(slug) {
  const normalized = normalizeSlug(slug);

  const { data, error } = await supabase
    .from("channels")
    .delete()
    .eq("slug", normalized)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo eliminar el canal: ${error.message}`);
  }

  if (!data) {
    throw new Error("No encontré ese canal.");
  }

  return data;
}

export async function setChannelActive(slug, active) {
  const normalized = normalizeSlug(slug);

  const { data, error } = await supabase
    .from("channels")
    .update({ active: Boolean(active) })
    .eq("slug", normalized)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cambiar el estado: ${error.message}`);
  }

  if (!data) {
    throw new Error("No encontré ese canal.");
  }

  return data;
}
