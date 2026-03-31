import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Navbar from '../components/ui/navbar'
import AnimalSelector from '../components/AnimalSelector'

import { useQuery } from '@tanstack/react-query'

interface Sighting {
  id: string
  animal_id: string
  latitude: number
  longitude: number
  timestamp: string
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// TOGGLE THIS TO ENABLE/DISABLE MAP RENDERING (for development performance)
const ENABLE_MAP = true

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  /** Sightings often resolve before Mapbox finishes init; markers effect must re-run after `load`. */
  const [mapReady, setMapReady] = useState(false)

  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Optional filters — omit time range by default so dev seed data (e.g. 2024) is not excluded by
  // a rolling "last 30 days" window. Pass `start`/`end` when the filters UI supplies them.
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [timeRange] = useState<{ start: string; end: string } | null>(null)

  const { data: sightings, isLoading } = useQuery<Sighting[]>({
    queryKey: ['sightings', speciesId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (speciesId) params.set('species_id', speciesId)
      if (timeRange) {
        params.set('start', timeRange.start)
        params.set('end', timeRange.end)
      }
      params.set('limit', '500')

      const res = await fetch(`/api/sightings?${params.toString()}`)

      if (!res.ok) throw new Error('Failed to fetch sightings')
      return res.json()
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  })

  useEffect(() => {
    if (!ENABLE_MAP || !mapContainerRef.current) return

    setMapReady(false)
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      projection: { name: 'globe' },
      center: [-98, 38],
      zoom: 3,
    })
    mapRef.current = map

    const onLoad = () => setMapReady(true)
    map.once('load', onLoad)

    return () => {
      map.off('load', onLoad)
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [ENABLE_MAP])

  useEffect(() => {
    if (!mapReady || !mapRef.current || sightings === undefined) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const map = mapRef.current

    sightings.forEach((sighting) => {
      const lng = Number(sighting.longitude)
      const lat = Number(sighting.latitude)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-1">
          <p class="text-sm font-medium">Observed: ${new Date(sighting.timestamp).toLocaleString()}</p>
        </div>`
      )

      const marker = new mapboxgl.Marker({ color: '#2563eb' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [sightings, mapReady])

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* navbar */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar*/}
        <aside className="w-80 border-r bg-card flex flex-col shadow-sm z-10">
          <div className="p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Map Filters
            </h2>
            {/* Person D's components go here */}
            <div className="space-y-4">
              <AnimalSelector
                selectedSpeciesId={speciesId}
                onSelect={setSpeciesId}
              />

              <div className="text-sm font-medium">
                {isLoading ? (
                  <span className="flex items-center gap-2 text-blue-500 animate-pulse">
                    Updating sightings...
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Found {sightings?.length || 0} locations
                  </span>
                )}
              </div>
              <div className="h-10 w-full bg-muted/50 rounded-md animate-pulse" />
              <div className="h-24 w-full bg-muted/50 rounded-md animate-pulse" />
            </div>
          </div>
        </aside>

        {/* map */}
        <main className="relative flex-1 bg-slate-100">
          {ENABLE_MAP ? (
            <div ref={mapContainerRef} className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="font-semibold text-xl">WildPath Explorer</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Map rendering is paused. Enable &quot;ENABLE_MAP&quot; in the code to begin tracking.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
