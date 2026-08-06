import { supabase } from "./supabase.js";
import { detectChannelType } from "./channels.js";

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePosterUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.hostname === "drive.google.com") {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = fileMatch?.[1] || url.searchParams.get("id");

      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
      }
    }
  } catch {
    return value;
  }

  return value;
}

export async function createMovie({
  title,
  videoUrl,
  description = "",
  genre = "General",
  releaseYear = null,
  posterUrl = null,
}) {
  if (!title?.trim()) throw new Error("El título es obligatorio.");
  if (!videoUrl?.trim()) throw new Error("El enlace del video es obligatorio.");

  const slug = normalizeSlug(title);
  const { data: existing, error: searchError } = await supabase
    .from("movies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (searchError) {
    throw new Error(`No se pudo comprobar la película: ${searchError.message}`);
  }
  if (existing) throw new Error(`Ya existe una película con el identificador ${slug}.`);

  const { data, error } = await supabase
    .from("movies")
    .insert({
      title: title.trim(),
      slug,
      video_url: videoUrl.trim(),
      video_type: detectChannelType(videoUrl),
      description: description?.trim() || null,
      genre: genre?.trim() || "General",
      release_year: releaseYear || null,
      poster_url: normalizePosterUrl(posterUrl),
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo crear la película: ${error.message}`);
  return data;
}

export async function listMovies() {
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`No se pudieron listar las películas: ${error.message}`);
  return data || [];
}

export async function getMovieBySlug(slug) {
  const normalized = normalizeSlug(slug);
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) throw new Error(`No se pudo buscar la película: ${error.message}`);
  return data;
}

export async function updateMoviePoster(slug, posterUrl) {
  const normalized = normalizeSlug(slug);
  const normalizedPoster = normalizePosterUrl(posterUrl);

  if (!normalizedPoster) throw new Error("El enlace de la portada es obligatorio.");

  const { data, error } = await supabase
    .from("movies")
    .update({
      poster_url: normalizedPoster,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", normalized)
    .select()
    .maybeSingle();

  if (error) throw new Error(`No se pudo actualizar la portada: ${error.message}`);
  if (!data) throw new Error("No encontré esa película.");
  return data;
}

export async function deleteMovie(slug) {
  const normalized = normalizeSlug(slug);
  const { data, error } = await supabase
    .from("movies")
    .delete()
    .eq("slug", normalized)
    .select()
    .maybeSingle();

  if (error) throw new Error(`No se pudo eliminar la película: ${error.message}`);
  if (!data) throw new Error("No encontré esa película.");
  return data;
}

export async function setMovieActive(slug, active) {
  const normalized = normalizeSlug(slug);
  const { data, error } = await supabase
    .from("movies")
    .update({
      active: Boolean(active),
      updated_at: new Date().toISOString(),
    })
    .eq("slug", normalized)
    .select()
    .maybeSingle();

  if (error) throw new Error(`No se pudo cambiar el estado: ${error.message}`);
  if (!data) throw new Error("No encontré esa película.");
  return data;
}
