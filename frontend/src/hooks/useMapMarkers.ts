import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import type { Sighting } from "@/types/sighting";
import { buildGbifPopup, buildMovebankPopup } from "@/lib/popupBuilders";

const SOURCE_ID = "sighting-points";
const CLUSTER_LAYER = "sighting-clusters";
const CLUSTER_COUNT_LAYER = "sighting-cluster-count";
const POINT_LAYER = "sighting-unclustered";

interface Options {
  sightings: Sighting[];
  map: mapboxgl.Map | null;
  mapReady: boolean;
  isGbifMode: boolean;
}

function buildGeoJSON(sightings: Sighting[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = sightings
    .filter((s) => {
      const lng = Number(s.longitude);
      const lat = Number(s.latitude);
      return Number.isFinite(lng) && Number.isFinite(lat);
    })
    .map((s) => ({
      type: "Feature" as const,
      properties: {
        id: s.id,
        common_name: s.common_name ?? s.animal_name ?? "Unknown",
        scientific_name: s.scientific_name ?? "",
        timestamp: s.timestamp,
        source: s.source ?? "movebank",
        country: s.country ?? "",
        basisOfRecord: s.basisOfRecord ?? "",
        animal_name: s.animal_name ?? "",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [Number(s.longitude), Number(s.latitude)],
      },
    }));

  return { type: "FeatureCollection", features };
}

function propsToSighting(props: Record<string, unknown>): Sighting {
  return {
    id: String(props.id ?? ""),
    animal_id: "",
    latitude: 0,
    longitude: 0,
    timestamp: String(props.timestamp ?? ""),
    animal_name: props.animal_name ? String(props.animal_name) : null,
    species_id: null,
    common_name: props.common_name ? String(props.common_name) : null,
    scientific_name: props.scientific_name
      ? String(props.scientific_name)
      : null,
    source: props.source === "gbif" ? "gbif" : "movebank",
    country: props.country ? String(props.country) : null,
    basisOfRecord: props.basisOfRecord ? String(props.basisOfRecord) : null,
  };
}

function cleanupLayers(map: mapboxgl.Map) {
  if (map.getLayer(CLUSTER_COUNT_LAYER)) map.removeLayer(CLUSTER_COUNT_LAYER);
  if (map.getLayer(CLUSTER_LAYER)) map.removeLayer(CLUSTER_LAYER);
  if (map.getLayer(POINT_LAYER)) map.removeLayer(POINT_LAYER);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

export function useMapMarkers({
  sightings,
  map,
  mapReady,
  isGbifMode,
}: Options) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const handlePointClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (!map || !e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];
      const props = feature.properties ?? {};
      const sighting = propsToSighting(props);
      const html =
        sighting.source === "gbif"
          ? buildGbifPopup(sighting)
          : buildMovebankPopup(sighting);

      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({ offset: 15 })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    },
    [map],
  );

  const handleClusterClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (!map || !e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const clusterId = feature.properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
        });
      });
    },
    [map],
  );

  useEffect(() => {
    if (!map || !mapReady) return;

    if (!sightings || sightings.length === 0) {
      cleanupLayers(map);
      return;
    }

    const geojson = buildGeoJSON(sightings);
    cleanupLayers(map);

    const pointColor = isGbifMode ? "#16a34a" : "#2563eb";
    const clusterColor = isGbifMode ? "#15803d" : "#1d4ed8";

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles
    map.addLayer({
      id: CLUSTER_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": clusterColor,
        "circle-radius": [
          "step",
          ["get", "point_count"],
          18, // default radius
          10,
          22,
          50,
          28,
          200,
          34,
        ],
        "circle-opacity": 0.85,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Cluster count labels
    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // Individual points
    map.addLayer({
      id: POINT_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": pointColor,
        "circle-radius": 6,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
        "circle-opacity-transition": { duration: 300, delay: 0 },
      },
    });

    // Click handlers
    map.on("click", POINT_LAYER, handlePointClick);
    map.on("click", CLUSTER_LAYER, handleClusterClick);

    // Cursor changes
    const setCursor = () => {
      if (map.getCanvas()) map.getCanvas().style.cursor = "pointer";
    };
    const resetCursor = () => {
      if (map.getCanvas()) map.getCanvas().style.cursor = "";
    };

    map.on("mouseenter", POINT_LAYER, setCursor);
    map.on("mouseleave", POINT_LAYER, resetCursor);
    map.on("mouseenter", CLUSTER_LAYER, setCursor);
    map.on("mouseleave", CLUSTER_LAYER, resetCursor);

    return () => {
      popupRef.current?.remove();
      map.off("click", POINT_LAYER, handlePointClick);
      map.off("click", CLUSTER_LAYER, handleClusterClick);
      map.off("mouseenter", POINT_LAYER, setCursor);
      map.off("mouseleave", POINT_LAYER, resetCursor);
      map.off("mouseenter", CLUSTER_LAYER, setCursor);
      map.off("mouseleave", CLUSTER_LAYER, resetCursor);
      if (map.getStyle()) cleanupLayers(map);
    };
  }, [sightings, map, mapReady, isGbifMode, handlePointClick, handleClusterClick]);
}
