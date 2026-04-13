import { useState, useMemo } from 'react'

export type TimePreset = '7d' | '30d' | 'all'

interface MapFilters {
  speciesId: string | null
  setSpeciesId: (id: string | null) => void
  timePreset: TimePreset
  setTimePreset: (preset: TimePreset) => void
  bbox: [number, number, number, number] | null
  setBbox: (bbox: [number, number, number, number] | null) => void
  bboxEnabled: boolean
  setBboxEnabled: (enabled: boolean) => void
  queryParams: Record<string, string>
}

function computeTimeRange(preset: TimePreset): { start: string; end: string } | null {
  if (preset === 'all') return null
  const now = new Date()
  const days = preset === '7d' ? 7 : 30
  const start = new Date(now.getTime() - days * 86_400_000)
  return { start: start.toISOString(), end: now.toISOString() }
}

export function useMapFilters(): MapFilters {
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [timePreset, setTimePreset] = useState<TimePreset>('all')
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null)
  const [bboxEnabled, setBboxEnabled] = useState(false)

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { limit: '500' }

    if (speciesId) params.species_id = speciesId

    const range = computeTimeRange(timePreset)
    if (range) {
      params.start = range.start
      params.end = range.end
    }

    if (bboxEnabled && bbox) {
      params.bbox = bbox.join(',')
    }

    return params
  }, [speciesId, timePreset, bbox, bboxEnabled])

  return {
    speciesId, setSpeciesId,
    timePreset, setTimePreset,
    bbox, setBbox,
    bboxEnabled, setBboxEnabled,
    queryParams,
  }
}
