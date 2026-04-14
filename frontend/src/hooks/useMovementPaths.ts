import { useEffect } from 'react'
import type mapboxgl from 'mapbox-gl'
import type { Sighting } from '@/types/sighting'

const SOURCE_ID = 'movement-paths'
const LAYER_ID = 'movement-paths-layer'

/** Deterministic HSL color from a UUID string. */
function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 70%, 50%)`
}

function buildGeoJSON(sightings: Sighting[]): GeoJSON.FeatureCollection {
  const groups = new Map<string, Sighting[]>()
  for (const s of sightings) {
    const group = groups.get(s.animal_id)
    if (group) {
      group.push(s)
    } else {
      groups.set(s.animal_id, [s])
    }
  }

  const features: GeoJSON.Feature[] = []
  for (const [animalId, group] of groups) {
    if (group.length < 2) continue
    const sorted = [...group].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    features.push({
      type: 'Feature',
      properties: { animal_id: animalId, color: colorFromId(animalId) },
      geometry: {
        type: 'LineString',
        coordinates: sorted.map((s) => [Number(s.longitude), Number(s.latitude)]),
      },
    })
  }

  return { type: 'FeatureCollection', features }
}

function cleanupLayers(map: mapboxgl.Map) {
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
}

interface Options {
  sightings: Sighting[] | undefined
  map: mapboxgl.Map | null
  enabled: boolean
  mapReady: boolean
}

export function useMovementPaths({ sightings, map, enabled, mapReady }: Options) {
  useEffect(() => {
    if (!map || !mapReady) return

    if (!enabled || !sightings || sightings.length === 0) {
      cleanupLayers(map)
      return
    }

    const geojson = buildGeoJSON(sightings)
    cleanupLayers(map)

    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })
    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.5,
        'line-opacity': 0.75,
      },
    })

    return () => {
      if (map.getStyle()) cleanupLayers(map)
    }
  }, [sightings, map, enabled, mapReady])
}
