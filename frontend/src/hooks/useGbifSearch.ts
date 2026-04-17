import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import type { GbifSearchResult } from "@/types/gbif";

interface GbifSearchReturn {
  results: GbifSearchResult[];
  bestMatch: GbifSearchResult | null;
  isLoading: boolean;
  isDebouncing: boolean;
  error: Error | null;
}

export function useGbifSearch(query: string): GbifSearchReturn {
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebounce(trimmedQuery, 400);

  const { data, isLoading, error } = useQuery<{ results: GbifSearchResult[] }>(
    {
      queryKey: ["gbif-search", debouncedQuery],
      queryFn: async () => {
        const params = new URLSearchParams({ q: debouncedQuery });
        const res = await fetch(`/api/gbif/search?${params.toString()}`);
        if (!res.ok) throw new Error("GBIF search failed");
        return res.json();
      },
      enabled: debouncedQuery.length >= 2,
      staleTime: 60_000,
      retry: 1,
    },
  );

  const isDebouncing =
    trimmedQuery.length >= 2 && debouncedQuery !== trimmedQuery;
  const results = isDebouncing ? [] : (data?.results ?? []);
  const bestMatch = results.length > 0 ? results[0] : null;

  return {
    results,
    bestMatch,
    isLoading: isDebouncing || isLoading,
    isDebouncing,
    error: error as Error | null,
  };
}
