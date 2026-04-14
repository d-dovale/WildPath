import type { SpeciesDetailsResponse } from '../types'

export const PARTIAL_SPECIES_DETAILS_TTL_MS = 5 * 60 * 1000
export const FULL_SPECIES_DETAILS_TTL_MS = 60 * 60 * 1000

const ONE_HOUR_MS = 60 * 60 * 1000

type CacheEntry = {
  expiresAt: number
  value: SpeciesDetailsResponse
}

const speciesDetailsCache = new Map<string, CacheEntry>()

export function getSpeciesDetailsFromCache(speciesId: string): SpeciesDetailsResponse | null {
  const cached = speciesDetailsCache.get(speciesId)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    speciesDetailsCache.delete(speciesId)
    return null
  }

  return cached.value
}

export function setSpeciesDetailsInCache(
  speciesId: string,
  value: SpeciesDetailsResponse,
  ttlMs = ONE_HOUR_MS,
): void {
  speciesDetailsCache.set(speciesId, {
    expiresAt: Date.now() + ttlMs,
    value,
  })
}
