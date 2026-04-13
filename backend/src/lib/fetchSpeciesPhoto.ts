import axios from 'axios'
import type { SpeciesDetailsPhoto, SpeciesDetailsSpeciesRow } from '../types'

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search'
const warnedKeys = new Set<string>()

type PexelsPhoto = {
  url?: unknown
  photographer?: unknown
  photographer_url?: unknown
  alt?: unknown
  src?: Record<string, unknown>
}

type PexelsSearchResponse = {
  photos?: PexelsPhoto[]
}

function warnMissingEnvOnce(envVarName: string): void {
  if (warnedKeys.has(envVarName)) {
    return
  }

  warnedKeys.add(envVarName)
  console.warn(`[WildPath] WARNING: ${envVarName} is not set. Species enrichment will skip Pexels.`)
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePhoto(photo: PexelsPhoto): SpeciesDetailsPhoto | null {
  const src = photo.src ?? {}
  const imageUrl =
    asTrimmedString(src.landscape) ??
    asTrimmedString(src.large) ??
    asTrimmedString(src.large2x) ??
    asTrimmedString(src.original) ??
    asTrimmedString(src.medium) ??
    asTrimmedString(src.small) ??
    asTrimmedString(src.tiny) ??
    asTrimmedString(src.portrait)

  const photographer = asTrimmedString(photo.photographer)
  const photographerUrl = asTrimmedString(photo.photographer_url)
  const pexelsUrl = asTrimmedString(photo.url)

  if (!imageUrl || !photographer || !photographerUrl || !pexelsUrl) {
    return null
  }

  return {
    image_url: imageUrl,
    alt: asTrimmedString(photo.alt),
    photographer,
    photographer_url: photographerUrl,
    pexels_url: pexelsUrl,
    source: 'pexels',
  }
}

async function searchSpeciesPhoto(query: string, apiKey: string): Promise<SpeciesDetailsPhoto | null> {
  try {
    const { data } = await axios.get<PexelsSearchResponse>(PEXELS_SEARCH_URL, {
      headers: { Authorization: apiKey },
      params: { query, per_page: 1 },
      timeout: 5000,
    })

    const firstPhoto = Array.isArray(data.photos) ? data.photos[0] : null
    return firstPhoto ? normalizePhoto(firstPhoto) : null
  } catch (error) {
    console.warn(`[WildPath] WARNING: Pexels image lookup failed for "${query}".`, error)
    return null
  }
}

export async function fetchSpeciesPhoto(
  species: Pick<SpeciesDetailsSpeciesRow, 'common_name' | 'scientific_name'>,
): Promise<SpeciesDetailsPhoto | null> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    warnMissingEnvOnce('PEXELS_API_KEY')
    return null
  }

  const attemptedQueries = Array.from(new Set([species.common_name, species.scientific_name]))

  for (const query of attemptedQueries) {
    const photo = await searchSpeciesPhoto(query, apiKey)
    if (photo) {
      return photo
    }
  }

  return null
}
