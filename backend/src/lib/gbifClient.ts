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
  backboneKey?: number;
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

const SEARCH_RESULT_LIMIT = 100;
const SUBSTRING_TIER = 1;
const TOKEN_TIER = 2;
const PREFIX_TIER = 3;
const EXACT_TIER = 4;

export async function searchSpecies(
  query: string,
): Promise<GbifSearchResult[]> {
  // 1. Search by vernacular (common) name
  const searchRes = await client.get("/species/search", {
    params: {
      q: query,
      qField: "VERNACULAR",
      limit: SEARCH_RESULT_LIMIT,
      rank: "SPECIES",
      status: "ACCEPTED",
    },
  });

  const searchResults = rankSearchResults(
    (searchRes.data.results ?? []).map((r: Record<string, unknown>) =>
      mapSearchResult(r),
    ),
    query,
  );

  if (searchResults.length > 0) return searchResults;

  // 2. Fallback: fuzzy scientific name match
  const matchRes = await client.get("/species/match", {
    params: { name: query, verbose: true },
  });

  const match = matchRes.data;
  if (match.matchType === "NONE") return [];

  return rankSearchResults([mapMatchResult(match)], query);
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
    backboneKey:
      typeof r.nubKey === "number" ? (r.nubKey as number) : undefined,
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
    backboneKey:
      typeof r.usageKey === "number" ? (r.usageKey as number) : undefined,
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

interface ScoredSearchResult {
  result: GbifSearchResult;
  score: number;
  tier: number;
  quality: number;
}

function rankSearchResults(
  results: GbifSearchResult[],
  query: string,
): GbifSearchResult[] {
  const scoredResults = results
    .filter(isAnimalSuggestion)
    .map((result) => scoreSearchResult(result, query))
    .filter((entry) => entry.tier > 0);

  if (scoredResults.length === 0) {
    return [];
  }

  const backboneResults = scoredResults.filter(
    (entry) => entry.result.backboneKey !== undefined,
  );
  const preferredResults =
    backboneResults.length > 0 ? backboneResults : scoredResults;

  const dedupedByKey = dedupeScoredResults(
    preferredResults,
    (entry) => String(entry.result.key),
  );
  const dedupedByScientificName = dedupeScoredResults(
    dedupedByKey,
    (entry) => normalizeSearchText(getScientificLabel(entry.result)),
  );

  const sortedResults = dedupedByScientificName.sort(compareScoredResults);
  const maxTier = sortedResults[0]?.tier ?? 0;

  if (maxTier === EXACT_TIER) {
    return sortedResults.slice(0, 1).map((entry) => entry.result);
  }

  return sortedResults
    .filter((entry) => {
      if (maxTier >= TOKEN_TIER) {
        return entry.tier >= TOKEN_TIER;
      }

      return true;
    })
    .map((entry) => entry.result);
}

function dedupeScoredResults(
  results: ScoredSearchResult[],
  getKey: (entry: ScoredSearchResult) => string,
): ScoredSearchResult[] {
  const deduped = new Map<string, ScoredSearchResult>();

  for (const entry of results) {
    const key = getKey(entry);
    const existing = deduped.get(key);
    if (!existing || compareScoredResults(entry, existing) < 0) {
      deduped.set(key, entry);
    }
  }

  return Array.from(deduped.values());
}

function compareScoredResults(
  left: ScoredSearchResult,
  right: ScoredSearchResult,
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.quality !== right.quality) {
    return right.quality - left.quality;
  }

  const leftLabelLength = getPrimaryLabel(left.result).length;
  const rightLabelLength = getPrimaryLabel(right.result).length;
  if (leftLabelLength !== rightLabelLength) {
    return leftLabelLength - rightLabelLength;
  }

  return getPrimaryLabel(left.result).localeCompare(getPrimaryLabel(right.result));
}

function scoreSearchResult(
  result: GbifSearchResult,
  query: string,
): ScoredSearchResult {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const vernacularLabel = normalizeSearchText(result.vernacularName);
  const scientificLabel = normalizeSearchText(getScientificLabel(result));
  const primaryLabel = normalizeSearchText(getPrimaryLabel(result));
  const isSingleTokenQuery = queryTokens.length === 1;

  const vernacularTier = getMatchTier(vernacularLabel, normalizedQuery, queryTokens);
  const scientificTier = getMatchTier(scientificLabel, normalizedQuery, queryTokens);
  const primaryTier = getMatchTier(primaryLabel, normalizedQuery, queryTokens);
  const tier = Math.max(vernacularTier, scientificTier, primaryTier);

  let score = 0;
  if (vernacularTier === EXACT_TIER) score = 400;
  else if (scientificTier === EXACT_TIER) score = 360;
  else if (primaryTier === EXACT_TIER) score = 340;
  else if (vernacularTier === PREFIX_TIER) score = isSingleTokenQuery ? 210 : 300;
  else if (scientificTier === PREFIX_TIER || primaryTier === PREFIX_TIER) {
    score = isSingleTokenQuery ? 190 : 260;
  }
  else if (vernacularTier === TOKEN_TIER) score = 220;
  else if (scientificTier === TOKEN_TIER || primaryTier === TOKEN_TIER) score = 200;
  else if (vernacularTier === SUBSTRING_TIER) score = 140;
  else if (
    scientificTier === SUBSTRING_TIER ||
    primaryTier === SUBSTRING_TIER
  ) {
    score = 120;
  }

  if (queryTokens.length === 1) {
    const queryToken = queryTokens[0];
    score += Math.max(
      getSingleTokenBonus(vernacularLabel, queryToken),
      getSingleTokenBonus(primaryLabel, queryToken),
      getSingleTokenBonus(scientificLabel, queryToken),
    );
  }

  return {
    result,
    score,
    tier,
    quality: getSearchResultQuality(result),
  };
}

function getMatchTier(
  label: string,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  if (!label || !normalizedQuery) {
    return 0;
  }

  if (label === normalizedQuery) {
    return EXACT_TIER;
  }

  if (label.startsWith(normalizedQuery)) {
    return PREFIX_TIER;
  }

  const labelTokens = label.split(" ").filter(Boolean);
  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => labelTokens.includes(token))
  ) {
    return TOKEN_TIER;
  }

  if (label.includes(normalizedQuery)) {
    return SUBSTRING_TIER;
  }

  return 0;
}

function getSingleTokenBonus(label: string, queryToken: string): number {
  if (!label || !queryToken) {
    return 0;
  }

  const labelTokens = label.split(" ").filter(Boolean);
  if (!labelTokens.includes(queryToken)) {
    return 0;
  }

  if (label === queryToken) {
    return 80;
  }

  const firstToken = labelTokens[0];
  const lastToken = labelTokens[labelTokens.length - 1];

  if (firstToken === queryToken) {
    return 30;
  }

  if (lastToken === queryToken) {
    return 35;
  }

  return labelTokens.length <= 2 ? 20 : 5;
}

function getSearchResultQuality(result: GbifSearchResult): number {
  let quality = 0;

  if (result.vernacularName) quality += 20;
  if (result.canonicalName) quality += 10;
  if (result.kingdom) quality += 4;
  if (result.phylum) quality += 3;
  if (result.class) quality += 3;
  if (result.order) quality += 3;
  if (result.family) quality += 3;
  if (result.genus) quality += 3;

  const scientificGenus = normalizeSearchText(getScientificLabel(result))
    .split(" ")
    .filter(Boolean)[0];
  const mappedGenus = normalizeSearchText(result.genus);
  if (mappedGenus) {
    quality += scientificGenus === mappedGenus ? 12 : -20;
  }

  return quality;
}

function getPrimaryLabel(result: GbifSearchResult): string {
  return result.vernacularName?.trim() || getScientificLabel(result);
}

function getScientificLabel(result: GbifSearchResult): string {
  return result.canonicalName || result.scientificName;
}

function isAnimalSuggestion(result: GbifSearchResult): boolean {
  const normalizedKingdom = normalizeSearchText(result.kingdom);
  return (
    normalizedKingdom === "" ||
    normalizedKingdom === "animalia" ||
    normalizedKingdom === "metazoa"
  );
}

function normalizeSearchText(value: string | undefined): string {
  return value
    ?.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ") ?? "";
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
