import { useRef, useEffect, useState, useCallback, useMemo } from "react";
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
import { useInsights } from "../hooks/useInsights";
import { useMovementPaths } from "../hooks/useMovementPaths";
import InsightsPanel, { type GbifInsightsData } from "../components/InsightsPanel";
import { useGbifOccurrences } from "../hooks/useGbifOccurrences";
import { useGbifDensityLayer } from "../hooks/useGbifDensityLayer";
import { useMapMarkers } from "../hooks/useMapMarkers";
import type { Sighting } from "../types/sighting";
import type { GbifSearchResult } from "../types/gbif";

import { useQuery } from "@tanstack/react-query";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ENABLE_MAP = true;
const SECTION_CARD_CLASS =
  "rounded-[1.75rem] border border-white/15 bg-white/8 px-5 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm";

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

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

  const selectedMovebankSpeciesId = speciesId ?? viewedSpeciesId;
  const movebankDisplayQuery = useMemo(() => {
    const params = new URLSearchParams(queryParams);
    if (selectedMovebankSpeciesId) {
      params.set("species_id", selectedMovebankSpeciesId);
    } else {
      params.delete("species_id");
    }
    return params.toString();
  }, [queryParams, selectedMovebankSpeciesId]);

  // Insights query uses the same params as movebankDisplayQuery
  const insightsQueryParams = useMemo(() => {
    const parsed = new URLSearchParams(movebankDisplayQuery);
    const sortedEntries = [...parsed.entries()]
      .filter(([key]) => key !== "limit")
      .sort(([a], [b]) => a.localeCompare(b));

    return new URLSearchParams(sortedEntries).toString();
  }, [movebankDisplayQuery]);

  const {
    data: insightsData,
    isLoading: insightsLoading,
    isFetching: insightsFetching,
    isError: insightsError,
  } = useInsights(insightsQueryParams, dataSource !== "gbif");
  const movebankVisibleAreaQuery = useMemo(() => {
    const params = new URLSearchParams(queryParams);
    params.delete("species_id");
    return params.toString();
  }, [queryParams]);

  // MoveBank sightings shown on the map — only when a species is selected
  const { data: movebankSightings, isLoading: movebankLoading } = useQuery<
    Sighting[]
  >({
    queryKey: ["sightings", "selected", movebankDisplayQuery],
    queryFn: async () => {
      const res = await fetch(`/api/sightings?${movebankDisplayQuery}`);
      if (!res.ok) throw new Error("Failed to fetch sightings");
      return res.json();
    },
    enabled: dataSource !== "gbif" && selectedMovebankSpeciesId !== null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Visible-area species source data — used only to populate the lower list
  const { data: visibleAreaSightings } = useQuery<Sighting[]>({
    queryKey: ["sightings", "visible-area", movebankVisibleAreaQuery],
    queryFn: async () => {
      const res = await fetch(`/api/sightings?${movebankVisibleAreaQuery}`);
      if (!res.ok) throw new Error("Failed to fetch sightings");
      return res.json();
    },
    enabled: dataSource !== "gbif" && bboxEnabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // GBIF occurrences — only active when in GBIF mode
  const {
    sightings: gbifSightings,
    rawOccurrences,
    totalCount: gbifTotalCount,
    isLoading: gbifLoading,
    error: gbifError,
  } = useGbifOccurrences(dataSource === "gbif" ? gbifTaxonKey : null, {
    bbox,
    bboxEnabled,
    year: yearParam,
  });

  const gbifInsightsData = useMemo<GbifInsightsData | undefined>(() => {
    if (dataSource !== "gbif" || gbifTaxonKey === null) {
      return undefined;
    }

    const countrySet = new Set<string>();
    const basisCount = new Map<string, number>();
    const byDayCount = new Map<string, number>();
    let latestDate: string | null = null;

    rawOccurrences.forEach((occurrence) => {
      if (occurrence.country) {
        countrySet.add(occurrence.country);
      }

      const basisLabel = occurrence.basisOfRecord || "Unknown";
      basisCount.set(basisLabel, (basisCount.get(basisLabel) ?? 0) + 1);

      if (occurrence.eventDate) {
        const parsedDate = new Date(occurrence.eventDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          const dateKey = parsedDate.toISOString().slice(0, 10);
          byDayCount.set(dateKey, (byDayCount.get(dateKey) ?? 0) + 1);
          latestDate = latestDate === null || dateKey > latestDate ? dateKey : latestDate;
        }
      }
    });

    return {
      totalOccurrences: gbifTotalCount,
      countriesCount: countrySet.size,
      sampleSize: rawOccurrences.length,
      hasMoreResults: gbifTotalCount > rawOccurrences.length,
      latestDate,
      byDay: [...byDayCount.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byBasis: [...basisCount.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    };
  }, [dataSource, gbifTaxonKey, rawOccurrences, gbifTotalCount]);

  // Select active data based on source
  const isGbifMode = dataSource === "gbif" && gbifTaxonKey !== null;
  const activeSightings = isGbifMode
    ? gbifSightings
    : (movebankSightings ?? []);
  const isLoading = isGbifMode ? gbifLoading : movebankLoading;
  const hasSpeciesDetail =
    (isGbifMode && gbifTaxonKey !== null) ||
    (!isGbifMode && (speciesId !== null || viewedSpeciesId !== null));
  const showSpeciesInArea =
    !isGbifMode && bboxEnabled && !!visibleAreaSightings?.length;

  // GBIF density tile layer
  useGbifDensityLayer({
    map: mapInstance,
    mapReady,
    taxonKey: gbifTaxonKey,
    enabled: isGbifMode && showDensity,
  });

  // GeoJSON markers + clustering (replaces DOM markers)
  useMapMarkers({
    sightings: activeSightings,
    map: mapInstance,
    mapReady,
    isGbifMode,
  });

  // Update bbox from map viewport (debounced)
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
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

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      projection: { name: "globe" },
      center: [-98, 38],
      zoom: 3,
    });
    mapRef.current = map;
    setMapInstance(map);

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
      setMapInstance(null);
      setMapReady(false);
    };
  }, [handleMoveEnd]);

  // Movement paths layer (MoveBank only)
  useMovementPaths({
    sightings: isGbifMode ? undefined : movebankSightings,
    map: mapInstance,
    enabled: showPaths && !isGbifMode,
    mapReady,
  });

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <aside className="z-10 flex w-80 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
          {/* Species section */}
          <section className="relative z-20 px-4 pb-4 pt-4">
            <div className={SECTION_CARD_CLASS}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Species
              </h2>
              <SpeciesSearch
                searchQuery={searchQuery}
                selectedSpecies={gbifBestMatch}
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
                onBestMatchChange={(match) => {
                  setGbifBestMatch(match);
                  if (match) {
                    setSpeciesId(null);
                    setViewedSpeciesId(null);
                  }
                }}
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
                        {bboxEnabled &&
                          bbox &&
                          activeSightings.length === 0 && (
                            <span className="block text-xs mt-1">
                              Try zooming out or disabling viewport filter
                            </span>
                          )}
                      </>
                    )}
                  </span>
                )}
              </div>
              {hasSpeciesDetail ? (
                <div className="mt-5 border-t border-white/12 pt-5 space-y-5">
                  {isGbifMode && gbifTaxonKey && (
                    <GbifSpeciesInfoCard
                      taxonKey={gbifTaxonKey}
                      vernacularNameOverride={gbifBestMatch?.vernacularName}
                      embedded
                    />
                  )}

                  {!isGbifMode && (speciesId || viewedSpeciesId) && (
                    <SpeciesInfoCard
                      speciesId={speciesId ?? viewedSpeciesId!}
                      embedded
                    />
                  )}
                </div>
              ) : null}
            </div>
          </section>

          {/* Filters section */}
          <section className="relative z-0 px-4 pb-4">
            <div className={SECTION_CARD_CLASS}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Filters
              </h2>
              <div className="space-y-4">
                {!isGbifMode && (
                  <TimeRangeFilter
                    value={timePreset}
                    onChange={setTimePreset}
                  />
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
                    onCheckedChange={(checked) => {
                      setBboxEnabled(checked);
                      if (!checked) {
                        setViewedSpeciesId(null);
                      }
                    }}
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
          </section>

          {/* Insights section */}
          <section className="relative z-0 px-4 pb-4">
            <div className={SECTION_CARD_CLASS}>
              <InsightsPanel
                source={isGbifMode ? "gbif" : "movebank"}
                data={isGbifMode ? gbifInsightsData : insightsData}
                isLoading={isGbifMode ? gbifLoading : insightsLoading}
                isRefreshing={isGbifMode ? false : insightsFetching && !!insightsData}
                isError={isGbifMode ? !!gbifError : insightsError}
                contextLabel={
                  isGbifMode
                    ? (gbifBestMatch?.vernacularName ??
                      gbifBestMatch?.canonicalName ??
                      gbifBestMatch?.scientificName ??
                      null)
                    : null
                }
              />
            </div>
          </section>

          {showSpeciesInArea && (
            <section className="relative z-0 px-4 pb-6">
              <div className={SECTION_CARD_CLASS}>
                <SpeciesInArea
                  sightings={visibleAreaSightings}
                  onSelectSpecies={setViewedSpeciesId}
                  selectedSpeciesId={viewedSpeciesId}
                />
              </div>
            </section>
          )}

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
