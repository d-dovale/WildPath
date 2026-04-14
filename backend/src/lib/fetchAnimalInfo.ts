import axios from 'axios'
import type { AxiosError } from 'axios'
import type {
  SpeciesDetailsAnimalInfo,
  SpeciesDetailsCharacteristics,
  SpeciesDetailsSpeciesRow,
  SpeciesDetailsTaxonomy,
} from '../types'

const API_NINJAS_ANIMALS_URL = 'https://api.api-ninjas.com/v1/animals'
const warnedKeys = new Set<string>()

type ApiNinjasAnimal = {
  name?: unknown
  taxonomy?: Record<string, unknown>
  locations?: unknown
  characteristics?: Record<string, unknown>
}

function warnMissingEnvOnce(envVarName: string): void {
  if (warnedKeys.has(envVarName)) {
    return
  }

  warnedKeys.add(envVarName)
  console.warn(`[WildPath] WARNING: ${envVarName} is not set. Species enrichment will skip API Ninjas.`)
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeTaxonomy(taxonomy?: Record<string, unknown>): SpeciesDetailsTaxonomy {
  return {
    scientific_name: asTrimmedString(taxonomy?.scientific_name),
    class: asTrimmedString(taxonomy?.class),
    order: asTrimmedString(taxonomy?.order),
    family: asTrimmedString(taxonomy?.family),
    genus: asTrimmedString(taxonomy?.genus),
  }
}

function normalizeCharacteristics(
  characteristics?: Record<string, unknown>,
): SpeciesDetailsCharacteristics {
  return {
    habitat: asTrimmedString(characteristics?.habitat),
    diet: asTrimmedString(characteristics?.diet),
    lifespan: asTrimmedString(characteristics?.lifespan),
    weight: asTrimmedString(characteristics?.weight),
    height: asTrimmedString(characteristics?.height),
    top_speed: asTrimmedString(characteristics?.top_speed),
    estimated_population_size: asTrimmedString(characteristics?.estimated_population_size),
    biggest_threat: asTrimmedString(characteristics?.biggest_threat),
  }
}

function normalizeLocations(locations: unknown): string[] {
  if (!Array.isArray(locations)) {
    return []
  }

  return locations
    .map((location) => asTrimmedString(location))
    .filter((location): location is string => location !== null)
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function selectBestMatch(
  results: ApiNinjasAnimal[],
  species: Pick<SpeciesDetailsSpeciesRow, 'common_name' | 'scientific_name'>,
): ApiNinjasAnimal | null {
  if (results.length === 0) {
    return null
  }

  const scientificName = normalizeText(species.scientific_name)
  const commonName = normalizeText(species.common_name)

  const exactScientificName = results.find((result) => {
    const candidate = asTrimmedString(result.taxonomy?.scientific_name)
    return candidate !== null && normalizeText(candidate) === scientificName
  })
  if (exactScientificName) {
    return exactScientificName
  }

  const exactCommonName = results.find((result) => {
    const providerName = asTrimmedString(result.name)
    const characteristicsName = asTrimmedString(result.characteristics?.common_name)
    return [providerName, characteristicsName].some(
      (candidate) => candidate !== null && normalizeText(candidate) === commonName,
    )
  })
  if (exactCommonName) {
    return exactCommonName
  }

  return results[0] ?? null
}

function logApiNinjasLookupFailure(query: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError
    console.warn(`[WildPath] WARNING: API Ninjas animal lookup failed for "${query}".`, {
      message: axiosError.message,
      status: axiosError.response?.status ?? null,
      data: axiosError.response?.data ?? null,
    })
    return
  }

  console.warn(`[WildPath] WARNING: API Ninjas animal lookup failed for "${query}".`, {
    message: error instanceof Error ? error.message : String(error),
  })
}

async function searchAnimalInfo(
  query: string,
  apiKey: string,
): Promise<ApiNinjasAnimal[]> {
  try {
    const { data } = await axios.get<ApiNinjasAnimal[]>(API_NINJAS_ANIMALS_URL, {
      headers: { 'X-Api-Key': apiKey },
      params: { name: query },
      timeout: 5000,
    })

    return Array.isArray(data) ? data : []
  } catch (error) {
    logApiNinjasLookupFailure(query, error)
    return []
  }
}

export async function fetchAnimalInfo(
  species: Pick<SpeciesDetailsSpeciesRow, 'common_name' | 'scientific_name'>,
): Promise<SpeciesDetailsAnimalInfo | null> {
  const apiKey = process.env.API_NINJAS_API_KEY
  if (!apiKey) {
    warnMissingEnvOnce('API_NINJAS_API_KEY')
    return null
  }

  const attemptedQueries = Array.from(new Set([species.scientific_name, species.common_name]))
  const collectedResults: ApiNinjasAnimal[] = []

  for (const query of attemptedQueries) {
    const results = await searchAnimalInfo(query, apiKey)
    if (results.length > 0) {
      collectedResults.push(...results)
    }
  }

  const bestMatch = selectBestMatch(collectedResults, species)
  if (!bestMatch) {
    return null
  }

  return {
    taxonomy: normalizeTaxonomy(bestMatch.taxonomy),
    locations: normalizeLocations(bestMatch.locations),
    characteristics: normalizeCharacteristics(bestMatch.characteristics),
  }
}
