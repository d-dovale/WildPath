import axios from "axios";

const GBIF_BASE = "https://api.gbif.org/v1";
const TIMEOUT_MS = 10_000;

const client = axios.create({
  baseURL: GBIF_BASE,
  timeout: TIMEOUT_MS,
  headers: { "User-Agent": "WildPath/1.0 (wildlife tracking app)" },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GbifSearchResult {
  key: number;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  rank: string;
  status?: string;
  confidence?: number;
  matchType?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
}

export interface GbifOccurrence {
  key: number;
  decimalLatitude: number;
  decimalLongitude: number;
  eventDate: string | null;
  species: string;
  scientificName: string;
  country: string | null;
  basisOfRecord: string;
  media: GbifMedia[];
  iucnRedListCategory: string | null;
  datasetName: string | null;
  recordedBy: string | null;
}

export interface GbifMedia {
  type: string;
  identifier: string;
  title?: string;
  creator?: string;
  license?: string;
}

export interface GbifOccurrenceResponse {
  count: number;
  results: GbifOccurrence[];
}

export interface GbifSpeciesDetail {
  key: number;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  media: GbifMedia[];
  iucnRedListCategory?: string;
  vernacularNames: Array<{ vernacularName: string; language: string }>;
  imageUrl?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Species search — tries vernacular name search, then falls back to fuzzy match
// ---------------------------------------------------------------------------

export async function searchSpecies(
  query: string,
): Promise<GbifSearchResult[]> {
  // 1. Search by vernacular (common) name
  const searchRes = await client.get("/species/search", {
    params: {
      q: query,
      qField: "VERNACULAR",
      limit: 5,
      rank: "SPECIES",
      status: "ACCEPTED",
    },
  });

  const searchResults: GbifSearchResult[] = (searchRes.data.results ?? []).map(
    (r: Record<string, unknown>) => mapSearchResult(r),
  );

  if (searchResults.length > 0) return searchResults;

  // 2. Fallback: fuzzy scientific name match
  const matchRes = await client.get("/species/match", {
    params: { name: query, verbose: true },
  });

  const match = matchRes.data;
  if (match.matchType === "NONE") return [];

  return [mapMatchResult(match)];
}

// ---------------------------------------------------------------------------
// Occurrence search
// ---------------------------------------------------------------------------

interface OccurrenceOptions {
  limit?: number;
  offset?: number;
  bbox?: [number, number, number, number];
  year?: string;
}

export async function fetchOccurrences(
  taxonKey: number,
  options: OccurrenceOptions = {},
): Promise<GbifOccurrenceResponse> {
  const { limit = 300, offset = 0, bbox, year } = options;

  const params: Record<string, string | number | boolean> = {
    taxonKey,
    hasCoordinate: true,
    hasGeospatialIssue: false,
    occurrenceStatus: "PRESENT",
    limit: Math.min(limit, 300),
    offset,
  };

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    params.decimalLatitude = `${minLat},${maxLat}`;
    params.decimalLongitude = `${minLng},${maxLng}`;
  }

  if (year) {
    params.year = year;
  }

  const res = await client.get("/occurrence/search", { params });

  return {
    count: res.data.count ?? 0,
    results: (res.data.results ?? []).map((r: Record<string, unknown>) =>
      mapOccurrence(r),
    ),
  };
}

// ---------------------------------------------------------------------------
// Species detail (merged from multiple endpoints)
// ---------------------------------------------------------------------------

export async function fetchSpeciesDetail(
  key: number,
): Promise<GbifSpeciesDetail> {
  const [speciesRes, mediaRes, vernacularRes] = await Promise.all([
    client.get(`/species/${key}`),
    client.get(`/species/${key}/media`, { params: { limit: 5 } }),
    client.get(`/species/${key}/vernacularNames`, { params: { limit: 10 } }),
  ]);

  const species = speciesRes.data;
  const media: GbifMedia[] = (mediaRes.data.results ?? []).map(
    (m: Record<string, unknown>) => ({
      type: String(m.type ?? ""),
      identifier: String(m.identifier ?? ""),
      title: m.title ? String(m.title) : undefined,
      creator: m.creator ? String(m.creator) : undefined,
      license: m.license ? String(m.license) : undefined,
    }),
  );

  const vernacularNames: Array<{ vernacularName: string; language: string }> = (
    vernacularRes.data.results ?? []
  ).map((v: Record<string, unknown>) => ({
    vernacularName: String(v.vernacularName ?? ""),
    language: String(v.language ?? ""),
  }));

  // Pick best English vernacular name
  const englishName = vernacularNames.find(
    (v) => v.language === "eng" || v.language === "en",
  );

  return {
    key: species.key,
    scientificName: species.scientificName ?? "",
    canonicalName: species.canonicalName,
    vernacularName: englishName?.vernacularName ?? species.vernacularName,
    kingdom: species.kingdom,
    phylum: species.phylum,
    class: species.class,
    order: species.order,
    family: species.family,
    genus: species.genus,
    media,
    iucnRedListCategory: species.iucnRedListCategory,
    vernacularNames,
  };
}

// ---------------------------------------------------------------------------
// Mappers (raw API → typed objects)
// ---------------------------------------------------------------------------

function mapSearchResult(r: Record<string, unknown>): GbifSearchResult {
  // species/search returns `nubKey` as the backbone key
  const key = (r.nubKey ?? r.key) as number;

  // Extract first English vernacular name if available
  const vernacularNames = r.vernacularNames as
    | Array<{ vernacularName?: string; language?: string }>
    | undefined;
  const englishVernacular = vernacularNames?.find(
    (v) => v.language === "eng" || v.language === "en",
  );

  return {
    key,
    scientificName: String(r.scientificName ?? ""),
    canonicalName: r.canonicalName ? String(r.canonicalName) : undefined,
    vernacularName:
      englishVernacular?.vernacularName ??
      (r.vernacularName ? String(r.vernacularName) : undefined),
    rank: String(r.rank ?? ""),
    status: r.taxonomicStatus ? String(r.taxonomicStatus) : undefined,
    kingdom: r.kingdom ? String(r.kingdom) : undefined,
    phylum: r.phylum ? String(r.phylum) : undefined,
    class: r.class ? String(r.class) : undefined,
    order: r.order ? String(r.order) : undefined,
    family: r.family ? String(r.family) : undefined,
    genus: r.genus ? String(r.genus) : undefined,
  };
}

function mapMatchResult(r: Record<string, unknown>): GbifSearchResult {
  return {
    key: r.usageKey as number,
    scientificName: String(r.scientificName ?? ""),
    canonicalName: r.canonicalName ? String(r.canonicalName) : undefined,
    vernacularName: r.vernacularName ? String(r.vernacularName) : undefined,
    rank: String(r.rank ?? ""),
    confidence: r.confidence as number | undefined,
    matchType: r.matchType ? String(r.matchType) : undefined,
    kingdom: r.kingdom ? String(r.kingdom) : undefined,
    phylum: r.phylum ? String(r.phylum) : undefined,
    class: r.class ? String(r.class) : undefined,
    order: r.order ? String(r.order) : undefined,
    family: r.family ? String(r.family) : undefined,
    genus: r.genus ? String(r.genus) : undefined,
  };
}

function mapOccurrence(r: Record<string, unknown>): GbifOccurrence {
  const rawMedia = (r.media ?? []) as Array<Record<string, unknown>>;

  return {
    key: r.key as number,
    decimalLatitude: r.decimalLatitude as number,
    decimalLongitude: r.decimalLongitude as number,
    eventDate: r.eventDate ? String(r.eventDate) : null,
    species: String(r.species ?? r.scientificName ?? ""),
    scientificName: String(r.scientificName ?? ""),
    country: r.country ? String(r.country) : null,
    basisOfRecord: String(r.basisOfRecord ?? ""),
    media: rawMedia.map((m) => ({
      type: String(m.type ?? ""),
      identifier: String(m.identifier ?? ""),
      title: m.title ? String(m.title) : undefined,
      creator: m.creator ? String(m.creator) : undefined,
      license: m.license ? String(m.license) : undefined,
    })),
    iucnRedListCategory: r.iucnRedListCategory
      ? String(r.iucnRedListCategory)
      : null,
    datasetName: r.datasetName ? String(r.datasetName) : null,
    recordedBy: r.recordedBy ? String(r.recordedBy) : null,
  };
}
