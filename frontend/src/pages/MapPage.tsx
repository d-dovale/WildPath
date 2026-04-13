import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Navbar from "../components/ui/navbar";
import AnimalSelector from "../components/AnimalSelector";
import SpeciesInfoCard from "../components/SpeciesInfoCard";
import SpeciesInArea from "../components/SpeciesInArea";
import TimeRangeFilter from "../components/TimeRangeFilter";
import MovementPathsToggle from "../components/MovementPathsToggle";
import { useMapFilters } from "../hooks/useMapFilters";
import { useMovementPaths } from "../hooks/useMovementPaths";
import type { Sighting } from "../types/sighting";

import { useQuery } from "@tanstack/react-query";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// TOGGLE THIS TO ENABLE/DISABLE MAP RENDERING (for development performance)
const ENABLE_MAP = true;

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [showPaths, setShowPaths] = useState(false);
  const [viewedSpeciesId, setViewedSpeciesId] = useState<string | null>(null);

  const {
    speciesId,
    setSpeciesId,
    timePreset,
    setTimePreset,
    bbox,
    setBbox,
    bboxEnabled,
    setBboxEnabled,
    queryParams,
  } = useMapFilters();

  const { data: sightings, isLoading } = useQuery<Sighting[]>({
    queryKey: ["sightings", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams);
      const res = await fetch(`/api/sightings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sightings");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Update bbox from map viewport (debounced)
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    setBbox([
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]);
  }, [setBbox]);

  // Initialize map
  useEffect(() => {
    if (!ENABLE_MAP || !mapContainerRef.current) return;

    setMapReady(false);
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      projection: { name: "globe" },
      center: [-98, 38],
      zoom: 3,
    });
    mapRef.current = map;

    const onLoad = () => setMapReady(true);
    map.once("load", onLoad);

    // Debounced moveend for bbox updates
    let moveTimer: ReturnType<typeof setTimeout>;
    const onMoveEnd = () => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(handleMoveEnd, 300);
    };
    map.on("moveend", onMoveEnd);

    return () => {
      clearTimeout(moveTimer);
      map.off("moveend", onMoveEnd);
      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [handleMoveEnd]);

  // Render markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || sightings === undefined) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;

    sightings.forEach((sighting) => {
      const lng = Number(sighting.longitude);
      const lat = Number(sighting.latitude);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const name = sighting.common_name ?? sighting.animal_name ?? "Unknown";
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-1">
          <p class="text-sm font-semibold">${name}</p>
          ${sighting.scientific_name ? `<p class="text-xs italic text-gray-500">${sighting.scientific_name}</p>` : ""}
          <p class="text-xs text-gray-600 mt-1">${new Date(sighting.timestamp).toLocaleString()}</p>
        </div>`,
      );

      const marker = new mapboxgl.Marker({ color: "#2563eb" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [sightings, mapReady]);

  // Movement paths layer
  useMovementPaths({
    sightings,
    map: mapRef.current,
    enabled: showPaths,
    mapReady,
  });

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <aside className="w-80 border-r bg-card flex flex-col shadow-sm z-10 overflow-y-auto">
          {/* Species section */}
          <div className="p-6 pb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Species
            </h2>
            <AnimalSelector
              selectedSpeciesId={speciesId}
              onSelect={setSpeciesId}
            />
            <div className="text-sm font-medium mt-2">
              {isLoading ? (
                <span className="flex items-center gap-2 text-blue-500 animate-pulse">
                  Updating sightings...
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Found {sightings?.length ?? 0} locations
                  {bboxEnabled && bbox && sightings?.length === 0 && (
                    <span className="block text-xs mt-1">
                      Try zooming out or disabling viewport filter
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Species info card — shown for filtered species or clicked area species */}
          {(speciesId || viewedSpeciesId) && (
            <div className="px-6 pb-4">
              <SpeciesInfoCard speciesId={(speciesId ?? viewedSpeciesId)!} />
            </div>
          )}

          {/* Species in visible area */}
          {!speciesId && sightings && sightings.length > 0 && (
            <div className="px-6 pb-4">
              <SpeciesInArea
                sightings={sightings}
                onSelectSpecies={setViewedSpeciesId}
                selectedSpeciesId={viewedSpeciesId}
              />
            </div>
          )}

          {/* Filters section */}
          <div className="px-6 pb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Filters
            </h2>
            <div className="space-y-4">
              <TimeRangeFilter value={timePreset} onChange={setTimePreset} />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bbox-filter"
                  checked={bboxEnabled}
                  onChange={(e) => setBboxEnabled(e.target.checked)}
                  className="rounded border-muted-foreground"
                />
                <label
                  htmlFor="bbox-filter"
                  className="text-sm cursor-pointer select-none"
                >
                  Filter by visible area
                </label>
              </div>

              <MovementPathsToggle
                checked={showPaths}
                onCheckedChange={setShowPaths}
              />
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
                Map rendering is paused. Enable &quot;ENABLE_MAP&quot; in the
                code to begin tracking.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
