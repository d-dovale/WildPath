import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Navbar from "../components/ui/navbar";
import SpeciesSearch from "../components/SpeciesSearch";
import SpeciesInfoCard from "../components/SpeciesInfoCard";
import GbifSpeciesInfoCard from "../components/GbifSpeciesInfoCard";
import SpeciesInArea from "../components/SpeciesInArea";
import TimeRangeFilter from "../components/TimeRangeFilter";
import GbifYearFilter from "../components/GbifYearFilter";
import MovementPathsToggle from "../components/MovementPathsToggle";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { useMapFilters } from "../hooks/useMapFilters";
import { useMovementPaths } from "../hooks/useMovementPaths";
import { useGbifOccurrences } from "../hooks/useGbifOccurrences";
import { useGbifDensityLayer } from "../hooks/useGbifDensityLayer";
import { useMapMarkers } from "../hooks/useMapMarkers";
import type { Sighting } from "../types/sighting";
import type { GbifSearchResult } from "../types/gbif";

import { useQuery } from "@tanstack/react-query";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ENABLE_MAP = true;

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [showPaths, setShowPaths] = useState(false);
  const [viewedSpeciesId, setViewedSpeciesId] = useState<string | null>(null);
  const [showDensity, setShowDensity] = useState(true);
  const [gbifBestMatch, setGbifBestMatch] = useState<GbifSearchResult | null>(
    null,
  );

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
    searchQuery,
    setSearchQuery,
    gbifTaxonKey,
    setGbifTaxonKey,
    dataSource,
    setDataSource,
    yearPreset,
    setYearPreset,
    yearParam,
  } = useMapFilters();

  // MoveBank sightings — only active when not in GBIF mode
  const { data: movebankSightings, isLoading: movebankLoading } = useQuery<
    Sighting[]
  >({
    queryKey: ["sightings", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams);
      const res = await fetch(`/api/sightings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sightings");
      return res.json();
    },
    enabled: dataSource !== "gbif",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // GBIF occurrences — only active when in GBIF mode
  const {
    sightings: gbifSightings,
    totalCount: gbifTotalCount,
    isLoading: gbifLoading,
  } = useGbifOccurrences(dataSource === "gbif" ? gbifTaxonKey : null, {
    bbox,
    bboxEnabled,
    year: yearParam,
  });

  // Select active data based on source
  const isGbifMode = dataSource === "gbif" && gbifTaxonKey !== null;
  const activeSightings = isGbifMode
    ? gbifSightings
    : (movebankSightings ?? []);
  const isLoading = isGbifMode ? gbifLoading : movebankLoading;

  // GBIF density tile layer
  useGbifDensityLayer({
    map: mapRef.current,
    mapReady,
    taxonKey: gbifTaxonKey,
    enabled: isGbifMode && showDensity,
  });

  // GeoJSON markers + clustering (replaces DOM markers)
  useMapMarkers({
    sightings: activeSightings,
    map: mapRef.current,
    mapReady,
    isGbifMode,
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

  // Movement paths layer (MoveBank only)
  useMovementPaths({
    sightings: isGbifMode ? undefined : movebankSightings,
    map: mapRef.current,
    enabled: showPaths && !isGbifMode,
    mapReady,
  });

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Navbar hideSearch />

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <aside className="w-80 border-r bg-card flex flex-col shadow-sm z-10 overflow-y-auto">
          {/* Species search */}
          <div className="p-6 pb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Species
            </h2>
            <SpeciesSearch
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (q.trim().length === 0) {
                  setGbifTaxonKey(null);
                  setDataSource(null);
                  setSpeciesId(null);
                  setViewedSpeciesId(null);
                  setGbifBestMatch(null);
                }
              }}
              onGbifTaxonKeyChange={setGbifTaxonKey}
              onDataSourceChange={setDataSource}
              onBestMatchChange={setGbifBestMatch}
            />

            {/* Sighting count and source indicator */}
            <div className="text-sm font-medium mt-2">
              {isLoading ? (
                <span className="flex items-center gap-2 text-blue-500 animate-pulse">
                  Loading sightings...
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {isGbifMode ? (
                    <>
                      {activeSightings.length} occurrences
                      <span className="inline-block ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        GBIF
                      </span>
                      {gbifTotalCount > 300 && (
                        <span className="block text-xs mt-1 text-muted-foreground">
                          Showing 300 of {gbifTotalCount.toLocaleString()}{" "}
                          total.
                          {showDensity
                            ? " Density layer shows full range."
                            : " Enable density layer for full coverage."}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Found {activeSightings.length} locations
                      <span className="inline-block ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        MoveBank
                      </span>
                      {bboxEnabled && bbox && activeSightings.length === 0 && (
                        <span className="block text-xs mt-1">
                          Try zooming out or disabling viewport filter
                        </span>
                      )}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Species info card */}
          {isGbifMode && gbifTaxonKey && (
            <div className="px-6 pb-4">
              <GbifSpeciesInfoCard
                taxonKey={gbifTaxonKey}
                vernacularNameOverride={gbifBestMatch?.vernacularName}
              />
            </div>
          )}
          {!isGbifMode && (speciesId || viewedSpeciesId) && (
            <div className="px-6 pb-4">
              <SpeciesInfoCard speciesId={(speciesId ?? viewedSpeciesId)!} />
            </div>
          )}

          {/* Species in visible area (MoveBank mode only) */}
          {!isGbifMode &&
            !speciesId &&
            movebankSightings &&
            movebankSightings.length > 0 && (
              <div className="px-6 pb-4">
                <SpeciesInArea
                  sightings={movebankSightings}
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
              {!isGbifMode && (
                <TimeRangeFilter value={timePreset} onChange={setTimePreset} />
              )}

              {isGbifMode && (
                <GbifYearFilter value={yearPreset} onChange={setYearPreset} />
              )}

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="bbox-filter"
                  className="text-sm cursor-pointer"
                >
                  Filter by visible area
                </Label>
                <Switch
                  id="bbox-filter"
                  checked={bboxEnabled}
                  onCheckedChange={setBboxEnabled}
                />
              </div>

              {isGbifMode && (
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="density-toggle"
                    className="text-sm cursor-pointer"
                  >
                    Show density heatmap
                  </Label>
                  <Switch
                    id="density-toggle"
                    checked={showDensity}
                    onCheckedChange={setShowDensity}
                  />
                </div>
              )}

              {!isGbifMode && (
                <MovementPathsToggle
                  checked={showPaths}
                  onCheckedChange={setShowPaths}
                />
              )}
            </div>
          </div>

          {/* GBIF attribution */}
          {isGbifMode && (
            <div className="px-6 pb-4 mt-auto">
              <p className="text-xs text-muted-foreground">
                Occurrence data from{" "}
                <a
                  href="https://www.gbif.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GBIF.org
                </a>
              </p>
            </div>
          )}
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
