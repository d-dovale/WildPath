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

  // Optional filters — omit time range by default so dev seed data (e.g. 2024) is not excluded by
  // a rolling "last 30 days" window. Pass `start`/`end` when the filters UI supplies them.
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(true)

  const { data: sightings, isLoading } = useQuery<Sighting[]>({
    queryKey: ['sightings', speciesId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (speciesId) params.set('species_id', speciesId)
      params.set('limit', '2000') 
       const res = await fetch(`/api/sightings?${params.toString()}`)

      if (!res.ok) throw new Error('Failed to fetch sightings')
      return res.json()
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!ENABLE_MAP || !mapContainerRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      projection: { name: 'globe' },
      center: [-98, 38],
      zoom: 3,
    })
    mapRef.current = map

    map.on('load', () => {
      map.addSource('active-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      })

      map.addSource('trace-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      // Layer: History Trace (Gray dots)
      map.addLayer({
        id: 'sighting-trace',
        type: 'circle',
        source: 'trace-src',
        paint: {
          'circle-color': '#94a3b8',
          'circle-radius': 4,
          'circle-opacity': 0.4
        }
      })

      // Layer: Clusters (Blue circles)
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'active-src',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#2563eb',
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      })

      // Layer: Cluster Count
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'active-src',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: { 'text-color': '#ffffff' }
      })

      // Layer: Individual Latest Points
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'active-src',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#2563eb',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      })

      // Popup logic for single points
      const handlePopup = (e: mapboxgl.MapLayerMouseEvent) => {
        if (!e.features?.length) return
        const feature = e.features[0]
        const props = feature.properties as any
        
        new mapboxgl.Popup({ offset: 10 })
          .setLngLat((feature.geometry as any).coordinates)
          .setHTML(`
            <div style="padding: 5px;">
              <p style="margin: 0; font-weight: bold; color: #2563eb;">${props.animal_id}</p>
              <p style="margin: 0; font-size: 11px;">Seen: ${new Date(props.timestamp).toLocaleString()}</p>
            </div>
          `)
          .addTo(map)
      }

      map.on('click', 'unclustered-point', handlePopup)
      map.on('click', 'sighting-trace', handlePopup)

      map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer')
      map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '')

      setMapReady(true)
    })

    return () => { map.remove() }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const visibility = showHistory ? 'visible' : 'none'
    if (mapRef.current.getLayer('sighting-trace')) {
      mapRef.current.setLayoutProperty('sighting-trace', 'visibility', visibility)
    }
  }, [showHistory, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !sightings) return

    const activeSource = mapRef.current.getSource('active-src') as mapboxgl.GeoJSONSource
    const traceSource = mapRef.current.getSource('trace-src') as mapboxgl.GeoJSONSource

    const latestMap = new Map<string, string>()
    sightings.forEach(s => {
      const current = latestMap.get(s.animal_id)
      if (!current || new Date(s.timestamp) > new Date(current)) {
        latestMap.set(s.animal_id, s.timestamp)
      }
    })

    const activeFeatures: GeoJSON.Feature[] = []
    const traceFeatures: GeoJSON.Feature[] = []

    sightings.forEach(s => {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(s.longitude), Number(s.latitude)] },
        properties: { ...s }
      }

      if (s.timestamp === latestMap.get(s.animal_id)) {
        activeFeatures.push(feature)
      } else {
        traceFeatures.push(feature)
      }
    })

    activeSource.setData({ type: 'FeatureCollection', features: activeFeatures })
    traceSource.setData({ type: 'FeatureCollection', features: traceFeatures })
  }, [sightings, mapReady])

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* navbar */}
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* sidebar*/}
        <aside className="w-80 border-r bg-card flex flex-col shadow-sm z-10">
          <div className="p-6 space-y-8">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Map Filters
                </h2>
              <AnimalSelector selectedSpeciesId={speciesId} onSelect={setSpeciesId} />
            </section>

            <section className="pt-6 border-t">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Display Options</h2>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showHistory} 
                  onChange={(e) => setShowHistory(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Show Historical Trails</span>
              </label>
            </section>

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
        </aside>

        <main className="relative flex-1 bg-slate-100">
          <div ref={mapContainerRef} className="h-full w-full" />
        </main>
      </div>
    </div>
  )
}