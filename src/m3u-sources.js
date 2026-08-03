import { supabase } from "./supabase.js";

function cleanValue(value) {
  return String(value || "").trim();
}

export async function addM3uSource(name, url) {
  const cleanName = cleanValue(name);
  const cleanUrl = cleanValue(url);

  if (!cleanName) {
    throw new Error("El nombre de la lista es obligatorio.");
  }

  if (!cleanUrl) {
    throw new Error("La URL de la lista es obligatoria.");
  }

  try {
    const parsedUrl = new URL(cleanUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error("La URL de la lista no es válida.");
  }

  const { data, error } = await supabase
    .from("m3u_sources")
    .insert({
      name: cleanName,
      url: cleanUrl,
      active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe una lista con ese nombre.");
    }

    throw new Error(
      `No se pudo guardar la lista: ${error.message}`,
    );
  }

  return data;
}

export async function listM3uSources({
  onlyActive = false,
} = {}) {
  let query = supabase
    .from("m3u_sources")
    .select("*")
    .order("name", { ascending: true });

  if (onlyActive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `No se pudieron listar las fuentes M3U: ${error.message}`,
    );
  }

  return data || [];
}

export async function deleteM3uSource(name) {
  const cleanName = cleanValue(name);

  if (!cleanName) {
    throw new Error("Tenés que indicar el nombre de la lista.");
  }

  const { data, error } = await supabase
    .from("m3u_sources")
    .delete()
    .eq("name", cleanName)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo eliminar la lista: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("No encontré una lista con ese nombre.");
  }

  return data;
}

export async function setM3uSourceActive(
  name,
  active,
) {
  const cleanName = cleanValue(name);

  if (!cleanName) {
    throw new Error("Tenés que indicar el nombre de la lista.");
  }

  const { data, error } = await supabase
    .from("m3u_sources")
    .update({
      active: Boolean(active),
    })
    .eq("name", cleanName)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cambiar el estado de la lista: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("No encontré una lista con ese nombre.");
  }

  return data;
}
