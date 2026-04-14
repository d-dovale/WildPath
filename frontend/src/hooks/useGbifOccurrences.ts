import { useQuery } from "@tanstack/react-query";
import type { GbifOccurrence, GbifOccurrenceResponse } from "@/types/gbif";
import type { Sighting } from "@/types/sighting";

interface Options {
  bbox?: [number, number, number, number] | null;
  bboxEnabled?: boolean;
  limit?: number;
  year?: string;
}

interface GbifOccurrencesReturn {
  sightings: Sighting[];
  rawOccurrences: GbifOccurrence[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}

function occurrenceToSighting(occ: GbifOccurrence): Sighting {
  return {
    id: String(occ.key),
    animal_id: "gbif",
    latitude: occ.decimalLatitude,
    longitude: occ.decimalLongitude,
    timestamp: occ.eventDate ?? "",
    animal_name: null,
    species_id: null,
    common_name: occ.species,
    scientific_name: occ.scientificName,
    source: "gbif",
    country: occ.country,
    basisOfRecord: occ.basisOfRecord,
  };
}

export function useGbifOccurrences(
  taxonKey: number | null,
  options: Options = {},
): GbifOccurrencesReturn {
  const { bbox, bboxEnabled = false, limit = 300, year } = options;

  const { data, isLoading, error } = useQuery<GbifOccurrenceResponse>({
    queryKey: [
      "gbif-occurrences",
      taxonKey,
      bboxEnabled && bbox ? bbox.join(",") : null,
      limit,
      year ?? null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        taxonKey: String(taxonKey),
        limit: String(limit),
      });
      if (bboxEnabled && bbox) {
        params.set("bbox", bbox.join(","));
      }
      if (year) {
        params.set("year", year);
      }
      const res = await fetch(`/api/gbif/occurrences?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch GBIF occurrences");
      return res.json();
    },
    enabled: taxonKey !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const rawOccurrences = data?.results ?? [];
  const sightings = rawOccurrences.map(occurrenceToSighting);
  const totalCount = data?.count ?? 0;

  return {
    sightings,
    rawOccurrences,
    totalCount,
    isLoading,
    error: error as Error | null,
  };
}
