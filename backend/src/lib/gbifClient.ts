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

interface GbifSearchCandidate {
  result: GbifSearchResult;
  vernacularAliases: string[];
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
      mapSearchCandidate(r),
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

  return rankSearchResults([mapMatchCandidate(match)], query);
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

function mapSearchCandidate(r: Record<string, unknown>): GbifSearchCandidate {
  const vernacularAliases = getEnglishVernacularAliases(r);

  return {
    result: {
      key: (r.nubKey ?? r.key) as number,
      backboneKey:
        typeof r.nubKey === "number" ? (r.nubKey as number) : undefined,
      scientificName: String(r.scientificName ?? ""),
      canonicalName: r.canonicalName ? String(r.canonicalName) : undefined,
      vernacularName: vernacularAliases[0] ?? getFallbackVernacularName(r),
      rank: String(r.rank ?? ""),
      status: r.taxonomicStatus ? String(r.taxonomicStatus) : undefined,
      kingdom: r.kingdom ? String(r.kingdom) : undefined,
      phylum: r.phylum ? String(r.phylum) : undefined,
      class: r.class ? String(r.class) : undefined,
      order: r.order ? String(r.order) : undefined,
      family: r.family ? String(r.family) : undefined,
      genus: r.genus ? String(r.genus) : undefined,
    },
    vernacularAliases,
  };
}

function mapMatchCandidate(r: Record<string, unknown>): GbifSearchCandidate {
  const fallbackVernacular = r.vernacularName ? String(r.vernacularName) : undefined;

  return {
    result: {
      key: r.usageKey as number,
      backboneKey:
        typeof r.usageKey === "number" ? (r.usageKey as number) : undefined,
      scientificName: String(r.scientificName ?? ""),
      canonicalName: r.canonicalName ? String(r.canonicalName) : undefined,
      vernacularName: fallbackVernacular,
      rank: String(r.rank ?? ""),
      confidence: r.confidence as number | undefined,
      matchType: r.matchType ? String(r.matchType) : undefined,
      kingdom: r.kingdom ? String(r.kingdom) : undefined,
      phylum: r.phylum ? String(r.phylum) : undefined,
      class: r.class ? String(r.class) : undefined,
      order: r.order ? String(r.order) : undefined,
      family: r.family ? String(r.family) : undefined,
      genus: r.genus ? String(r.genus) : undefined,
    },
    vernacularAliases: fallbackVernacular ? [fallbackVernacular] : [],
  };
}

interface ScoredSearchResult {
  result: GbifSearchResult;
  score: number;
  tier: number;
  quality: number;
}

type SearchLabelSource = "vernacular" | "scientific" | "primary";

interface LabelScore {
  source: SearchLabelSource;
  label: string;
  tier: number;
  score: number;
}

interface AnimalQueryIntentHint {
  families: string[];
  genera: string[];
}

const ANIMAL_QUERY_HINTS: Record<string, AnimalQueryIntentHint> = {
  bear: {
    families: ["ursidae"],
    genera: ["ailuropoda", "helarctos", "melursus", "tremarctos", "ursus"],
  },
  deer: {
    families: ["cervidae"],
    genera: [
      "alces",
      "axis",
      "blastocerus",
      "capreolus",
      "cervus",
      "dama",
      "hippocamelus",
      "hydropotes",
      "mazama",
      "muntiacus",
      "odocoileus",
      "ozotoceros",
      "pudu",
      "rangifer",
      "rusa",
    ],
  },
  eagle: {
    families: ["accipitridae"],
    genera: [
      "aquila",
      "clanga",
      "haliaeetus",
      "hieraaetus",
      "ichethyophaga",
      "lophotriorchis",
      "nisaetus",
      "polemaetus",
      "spilornis",
      "spizaetus",
    ],
  },
};

function rankSearchResults(
  candidates: GbifSearchCandidate[],
  query: string,
): GbifSearchResult[] {
  const scoredResults = candidates
    .filter((candidate) => isAnimalSuggestion(candidate.result))
    .map((result) => scoreSearchResult(result, query))
    .filter((entry) => entry.tier > 0);

  if (scoredResults.length === 0) {
    return [];
  }

  const dedupedByKey = dedupeScoredResults(
    scoredResults,
    (entry) => String(entry.result.key),
  );
  const dedupedByScientificName = dedupeScoredResults(
    dedupedByKey,
    (entry) => normalizeSearchText(getScientificLabel(entry.result)),
  );

  const sortedResults = dedupedByScientificName.sort(compareScoredResults);
  const maxTier = sortedResults[0]?.tier ?? 0;
  const queryTokens = normalizeSearchText(query).split(" ").filter(Boolean);

  if (maxTier === EXACT_TIER && queryTokens.length > 1) {
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
  candidate: GbifSearchCandidate,
  query: string,
): ScoredSearchResult {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const result = candidate.result;
  const labelScores: LabelScore[] = [];

  for (const alias of candidate.vernacularAliases) {
    const labelScore = scoreLabelMatch(
      alias,
      "vernacular",
      normalizedQuery,
      queryTokens,
      result,
    );
    if (labelScore) labelScores.push(labelScore);
  }

  const scientificLabel = scoreLabelMatch(
    getScientificLabel(result),
    "scientific",
    normalizedQuery,
    queryTokens,
    result,
  );
  if (scientificLabel) labelScores.push(scientificLabel);

  const primaryLabel = scoreLabelMatch(
    getPrimaryLabel(result),
    "primary",
    normalizedQuery,
    queryTokens,
    result,
  );
  if (primaryLabel) labelScores.push(primaryLabel);

  const tier = labelScores.reduce(
    (maxTier, entry) => Math.max(maxTier, entry.tier),
    0,
  );
  const bestLabelScore = labelScores.sort(compareLabelScores)[0];

  return {
    result,
    score: bestLabelScore?.score ?? 0,
    tier,
    quality: getSearchResultQuality(result),
  };
}

function scoreLabelMatch(
  rawLabel: string | undefined,
  source: SearchLabelSource,
  normalizedQuery: string,
  queryTokens: string[],
  result: GbifSearchResult,
): LabelScore | null {
  const label = normalizeSearchText(rawLabel);
  const tier = getMatchTier(label, normalizedQuery, queryTokens);
  if (tier === 0) {
    return null;
  }

  const isBroadSingleTokenQuery = queryTokens.length === 1;
  let score = getBaseScore(source, tier, isBroadSingleTokenQuery);

  if (isBroadSingleTokenQuery) {
    const queryToken = queryTokens[0];
    score += getSingleTokenBonus(label, queryToken);
    score += getBroadAnimalIntentAdjustment(label, queryToken, source, result);
  }

  return { source, label, tier, score };
}

function getBaseScore(
  source: SearchLabelSource,
  tier: number,
  isBroadSingleTokenQuery: boolean,
): number {
  if (source === "vernacular") {
    if (tier === EXACT_TIER) return 400;
    if (tier === PREFIX_TIER) return isBroadSingleTokenQuery ? 210 : 300;
    if (tier === TOKEN_TIER) return 220;
    if (tier === SUBSTRING_TIER) return 140;
    return 0;
  }

  if (source === "scientific") {
    if (tier === EXACT_TIER) return 360;
    if (tier === PREFIX_TIER) return isBroadSingleTokenQuery ? 190 : 260;
    if (tier === TOKEN_TIER) return 200;
    if (tier === SUBSTRING_TIER) return 120;
    return 0;
  }

  if (tier === EXACT_TIER) return 340;
  if (tier === PREFIX_TIER) return isBroadSingleTokenQuery ? 190 : 260;
  if (tier === TOKEN_TIER) return 200;
  if (tier === SUBSTRING_TIER) return 120;
  return 0;
}

function compareLabelScores(left: LabelScore, right: LabelScore): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.tier !== right.tier) {
    return right.tier - left.tier;
  }

  return left.label.length - right.label.length;
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

function getBroadAnimalIntentAdjustment(
  label: string,
  queryToken: string,
  source: SearchLabelSource,
  result: GbifSearchResult,
): number {
  if (!label || !queryToken) {
    return 0;
  }

  const labelTokens = label.split(" ").filter(Boolean);
  const tokenIndex = labelTokens.indexOf(queryToken);
  const hasExactLabelMatch = label === queryToken;
  const taxonomyIntentStrength = getAnimalQueryIntentStrength(result, queryToken);
  let score = 0;

  if (hasExactLabelMatch) {
    score += 40;
  }

  if (tokenIndex === labelTokens.length - 1 && labelTokens.length > 1) {
    score += 70;
  }

  if (source !== "scientific" && tokenIndex === 0 && labelTokens.length > 1) {
    score -= 85;
  } else if (
    source !== "scientific" &&
    tokenIndex > 0 &&
    tokenIndex < labelTokens.length - 1
  ) {
    score -= 45;
  }

  if (taxonomyIntentStrength === 2) {
    score += 110;
  } else if (taxonomyIntentStrength === 1) {
    score += 60;
  } else if (source !== "scientific" && tokenIndex === 0 && labelTokens.length > 1) {
    score -= 25;
  }

  if (
    hasExactLabelMatch &&
    source !== "scientific" &&
    taxonomyIntentStrength < 2
  ) {
    score -= 180;
  }

  return score;
}

function getAnimalQueryIntentStrength(
  result: GbifSearchResult,
  queryToken: string,
): 0 | 1 | 2 {
  const hint = ANIMAL_QUERY_HINTS[queryToken];
  if (!hint) {
    return 0;
  }

  const family = normalizeSearchText(result.family);
  const genus = normalizeSearchText(result.genus);

  if (hint.genera.includes(genus)) {
    return 2;
  }

  if (hint.families.includes(family)) {
    return 1;
  }

  return 0;
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

function getEnglishVernacularAliases(r: Record<string, unknown>): string[] {
  const aliases = new Set<string>();
  const unlabeledAliases = new Set<string>();
  const vernacularNames = r.vernacularNames as
    | Array<{ vernacularName?: string; language?: string }>
    | undefined;

  for (const entry of vernacularNames ?? []) {
    const language = normalizeSearchText(entry.language);
    const vernacularName = entry.vernacularName?.trim();
    if (!vernacularName) {
      continue;
    }

    if (language === "eng" || language === "en" || language === "english") {
      aliases.add(vernacularName);
      continue;
    }

    if (!language) {
      unlabeledAliases.add(vernacularName);
    }
  }

  const fallbackVernacular = getFallbackVernacularName(r);
  if (fallbackVernacular) {
    aliases.add(fallbackVernacular);
  }

  for (const alias of unlabeledAliases) {
    aliases.add(alias);
  }

  return Array.from(aliases);
}

function getFallbackVernacularName(r: Record<string, unknown>): string | undefined {
  return r.vernacularName ? String(r.vernacularName) : undefined;
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
