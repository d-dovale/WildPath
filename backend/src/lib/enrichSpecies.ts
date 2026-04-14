import { supabase } from "./supabase";

export interface INatTaxon {
  default_photo?: { medium_url?: string };
  conservation_status?: { status_name?: string };
  wikipedia_url?: string;
  preferred_common_name?: string;
}

export interface WikiSummary {
  extract?: string;
  thumbnail?: { source?: string };
}

interface EnrichedFields {
  image_url?: string;
  description?: string;
  conservation_status?: string;
  common_name?: string;
  habitat?: string;
  range?: string;
  wikipedia_url?: string;
}

export async function fetchINaturalist(
  scientificName: string,
): Promise<INatTaxon | null> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: INatTaxon[] };
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchWikipedia(
  title: string,
): Promise<WikiSummary | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WildPath/1.0 (wildlife tracking app)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as WikiSummary;
  } catch {
    return null;
  }
}

/**
 * Enrich a species record with data from iNaturalist + Wikipedia.
 * Updates the DB row so subsequent calls use cached data.
 * Returns the enriched fields.
 */
export async function enrichSpecies(
  speciesId: string,
  scientificName: string,
): Promise<EnrichedFields> {
  const enriched: EnrichedFields = {};

  const inat = await fetchINaturalist(scientificName);

  if (inat) {
    if (inat.default_photo?.medium_url) {
      enriched.image_url = inat.default_photo.medium_url;
    }
    if (inat.conservation_status?.status_name) {
      enriched.conservation_status = inat.conservation_status.status_name;
    }
    if (inat.wikipedia_url) {
      enriched.wikipedia_url = inat.wikipedia_url;
    }
    if (inat.preferred_common_name) {
      enriched.common_name = inat.preferred_common_name;
    }
  }

  // Try Wikipedia for description and fallback image
  const wikiTitle = scientificName.replace(/ /g, "_");
  const wiki = await fetchWikipedia(wikiTitle);

  if (wiki) {
    if (wiki.extract) {
      enriched.description = wiki.extract;
    }
    if (!enriched.image_url && wiki.thumbnail?.source) {
      enriched.image_url = wiki.thumbnail.source;
    }
  }

  // Cache enriched data in the species table
  const updates: Record<string, string> = {};
  if (enriched.image_url) updates.image_url = enriched.image_url;
  if (enriched.description) updates.description = enriched.description;
  if (enriched.conservation_status)
    updates.conservation_status = enriched.conservation_status;
  if (enriched.common_name) updates.common_name = enriched.common_name;
  if (enriched.wikipedia_url) updates.wikipedia_url = enriched.wikipedia_url;

  if (Object.keys(updates).length > 0) {
    await supabase.from("species").update(updates).eq("id", speciesId);
  }

  return enriched;
}
