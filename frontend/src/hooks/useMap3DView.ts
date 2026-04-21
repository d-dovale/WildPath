import { useEffect } from "react";
import type { FillExtrusionLayer, Map } from "mapbox-gl";

const DEM_SOURCE_ID = "wildpath-terrain-dem";
const BUILDINGS_LAYER_ID = "wildpath-3d-buildings";
const THREE_D_PITCH = 60;
const THREE_D_BEARING = 20;
const THREE_D_MIN_ZOOM = 4.5;

function ensureTerrainSource(map: Map) {
  if (map.getSource(DEM_SOURCE_ID)) return;

  map.addSource(DEM_SOURCE_ID, {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
    tileSize: 512,
    maxzoom: 14,
  });
}

function ensureBuildingsLayer(map: Map) {
  if (map.getLayer(BUILDINGS_LAYER_ID)) return;

  const styleLayers = map.getStyle().layers ?? [];
  const hasCompositeSource = Boolean(map.getSource("composite"));
  const hasBuildingSourceLayer = styleLayers.some(
    (layer) =>
      layer.source === "composite" && layer["source-layer"] === "building",
  );

  if (!hasCompositeSource || !hasBuildingSourceLayer) return;

  const labelLayerId = styleLayers.find((layer) => layer.type === "symbol")?.id;

  const buildingsLayer: FillExtrusionLayer = {
    id: BUILDINGS_LAYER_ID,
    type: "fill-extrusion",
    source: "composite",
    "source-layer": "building",
    filter: ["==", ["get", "extrude"], "true"],
    minzoom: 14,
    paint: {
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["get", "height"],
        0,
        "#cbd5e1",
        80,
        "#94a3b8",
        200,
        "#64748b",
      ],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": 0.72,
      "fill-extrusion-vertical-gradient": true,
    },
  };

  map.addLayer(buildingsLayer, labelLayerId);
}

function disable3DView(map: Map) {
  if (map.getLayer(BUILDINGS_LAYER_ID)) {
    map.removeLayer(BUILDINGS_LAYER_ID);
  }

  map.setTerrain(null);
  map.easeTo({
    pitch: 0,
    bearing: 0,
    duration: 800,
    essential: true,
  });
}

interface Options {
  enabled: boolean;
  map: Map | null;
  mapReady: boolean;
}

export function useMap3DView({ enabled, map, mapReady }: Options) {
  useEffect(() => {
    if (!map || !mapReady) return;

    if (!enabled) {
      disable3DView(map);
      return;
    }

    ensureTerrainSource(map);
    map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.2 });
    ensureBuildingsLayer(map);
    map.easeTo({
      pitch: THREE_D_PITCH,
      bearing: THREE_D_BEARING,
      zoom: Math.max(map.getZoom(), THREE_D_MIN_ZOOM),
      duration: 1200,
      essential: true,
    });
  }, [enabled, map, mapReady]);
}
