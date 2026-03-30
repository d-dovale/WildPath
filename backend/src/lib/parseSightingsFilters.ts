import type { Request } from 'express'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isParseableDateTime(s: string): boolean {
  const t = Date.parse(s)
  return !Number.isNaN(t)
}

export type SightingsFilters =
  | { ok: true; species_id?: string; bbox?: [number, number, number, number]; start?: string; end?: string }
  | { ok: false; status: 400; body: { error: string } }

/**
 * Validates shared query params for `/api/sightings` and `/api/insights`.
 * Does not parse `limit` (sightings-only).
 */
export function parseSightingsFilters(query: Request['query']): SightingsFilters {
  const speciesIdParam = query.species_id
  let species_id: string | undefined
  if (speciesIdParam !== undefined) {
    if (typeof speciesIdParam !== 'string' || !UUID_RE.test(speciesIdParam.trim())) {
      return { ok: false, status: 400, body: { error: 'species_id must be a valid UUID' } }
    }
    species_id = speciesIdParam.trim()
  }

  const bboxParam = query.bbox
  let bbox: [number, number, number, number] | undefined
  if (bboxParam !== undefined) {
    if (typeof bboxParam !== 'string') {
      return { ok: false, status: 400, body: { error: 'Invalid bbox parameter' } }
    }
    const rawSegments = bboxParam.split(',')
    if (rawSegments.length !== 4) {
      return {
        ok: false,
        status: 400,
        body: { error: 'bbox must be four numbers: minLng,minLat,maxLng,maxLat' },
      }
    }
    const parts: number[] = []
    for (const seg of rawSegments) {
      const t = seg.trim()
      if (t === '') {
        return {
          ok: false,
          status: 400,
          body: { error: 'bbox must be four numbers: minLng,minLat,maxLng,maxLat' },
        }
      }
      const n = Number(t)
      if (!Number.isFinite(n)) {
        return {
          ok: false,
          status: 400,
          body: { error: 'bbox must be four numbers: minLng,minLat,maxLng,maxLat' },
        }
      }
      parts.push(n)
    }
    if (
      parts[0] < -180 ||
      parts[0] > 180 ||
      parts[2] < -180 ||
      parts[2] > 180 ||
      parts[1] < -90 ||
      parts[1] > 90 ||
      parts[3] < -90 ||
      parts[3] > 90
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: 'bbox must be four numbers: minLng,minLat,maxLng,maxLat' },
      }
    }
    if (parts[0] > parts[2] || parts[1] > parts[3]) {
      return {
        ok: false,
        status: 400,
        body: {
          error:
            'bbox minLng must be <= maxLng and minLat must be <= maxLat (antimeridian wrap not supported)',
        },
      }
    }
    bbox = parts as [number, number, number, number]
  }

  const startParam = query.start
  let start: string | undefined
  if (startParam !== undefined) {
    if (typeof startParam !== 'string') {
      return { ok: false, status: 400, body: { error: 'start must be a parseable date-time string' } }
    }
    const trimmed = startParam.trim()
    if (trimmed.length === 0 || !isParseableDateTime(trimmed)) {
      return { ok: false, status: 400, body: { error: 'start must be a parseable date-time string' } }
    }
    start = trimmed
  }

  const endParam = query.end
  let end: string | undefined
  if (endParam !== undefined) {
    if (typeof endParam !== 'string') {
      return { ok: false, status: 400, body: { error: 'end must be a parseable date-time string' } }
    }
    const trimmed = endParam.trim()
    if (trimmed.length === 0 || !isParseableDateTime(trimmed)) {
      return { ok: false, status: 400, body: { error: 'end must be a parseable date-time string' } }
    }
    end = trimmed
  }

  return { ok: true, species_id, bbox, start, end }
}
