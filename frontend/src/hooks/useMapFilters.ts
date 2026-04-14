import { useState, useMemo } from "react";

export type TimePreset = "7d" | "30d" | "all";
export type YearPreset = "5y" | "10y" | "all";
export type DataSource = "movebank" | "gbif" | null;

interface MapFilters {
  speciesId: string | null;
  setSpeciesId: (id: string | null) => void;
  timePreset: TimePreset;
  setTimePreset: (preset: TimePreset) => void;
  bbox: [number, number, number, number] | null;
  setBbox: (bbox: [number, number, number, number] | null) => void;
  bboxEnabled: boolean;
  setBboxEnabled: (enabled: boolean) => void;
  queryParams: Record<string, string>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  gbifTaxonKey: number | null;
  setGbifTaxonKey: (key: number | null) => void;
  dataSource: DataSource;
  setDataSource: (src: DataSource) => void;
  yearPreset: YearPreset;
  setYearPreset: (preset: YearPreset) => void;
  yearParam: string | undefined;
}

function computeTimeRange(
  preset: TimePreset,
): { start: string; end: string } | null {
  if (preset === "all") return null;
  const now = new Date();
  const days = preset === "7d" ? 7 : 30;
  const start = new Date(now.getTime() - days * 86_400_000);
  return { start: start.toISOString(), end: now.toISOString() };
}

export function useMapFilters(): MapFilters {
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [timePreset, setTimePreset] = useState<TimePreset>("all");
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(
    null,
  );
  const [bboxEnabled, setBboxEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gbifTaxonKey, setGbifTaxonKey] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [yearPreset, setYearPreset] = useState<YearPreset>("all");

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { limit: "500" };

    if (speciesId) params.species_id = speciesId;

    const range = computeTimeRange(timePreset);
    if (range) {
      params.start = range.start;
      params.end = range.end;
    }

    if (bboxEnabled && bbox) {
      params.bbox = bbox.join(",");
    }

    return params;
  }, [speciesId, timePreset, bbox, bboxEnabled]);

  const yearParam = useMemo(() => {
    if (yearPreset === "all") return undefined;
    const currentYear = new Date().getFullYear();
    const startYear = yearPreset === "5y" ? currentYear - 5 : currentYear - 10;
    return `${startYear},${currentYear}`;
  }, [yearPreset]);

  return {
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
  };
}
