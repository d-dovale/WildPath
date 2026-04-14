import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";

const SOURCE_ID = "gbif-density";
const LAYER_ID = "gbif-density-layer";

const GBIF_TILE_URL =
  "https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png";

interface Options {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  taxonKey: number | null;
  enabled: boolean;
}

function cleanup(map: mapboxgl.Map) {
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

export function useGbifDensityLayer({
  map,
  mapReady,
  taxonKey,
  enabled,
}: Options) {
  useEffect(() => {
    if (!map || !mapReady) return;

    if (!enabled || taxonKey === null) {
      cleanup(map);
      return;
    }

    // Remove previous layer before adding new one
    cleanup(map);

    const tileUrl = `${GBIF_TILE_URL}?taxonKey=${taxonKey}&style=purpleHeat.point&bin=hex&hexPerTile=30`;

    map.addSource(SOURCE_ID, {
      type: "raster",
      tiles: [tileUrl],
      tileSize: 512,
    });

    map.addLayer({
      id: LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      paint: {
        "raster-opacity": 0.8,
        "raster-fade-duration": 0,
      },
    });

    // Suppress tile decode errors for GBIF tiles
    const onError = (e: mapboxgl.ErrorEvent) => {
      const msg = e.error?.message ?? "";
      if (msg.includes("Could not load image")) {
        return;
      }
    };
    map.on("error", onError);

    return () => {
      map.off("error", onError);
      if (map.getStyle()) cleanup(map);
    };
  }, [map, mapReady, taxonKey, enabled]);
}
