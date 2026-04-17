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
  const hasMinimumQueryLength = trimmedQuery.length >= 2;
  const effectiveQuery = hasMinimumQueryLength ? debouncedQuery : "";

  const { data, isLoading, error } = useQuery<{ results: GbifSearchResult[] }>(
    {
      queryKey: ["gbif-search", effectiveQuery],
      queryFn: async () => {
        const params = new URLSearchParams({ q: effectiveQuery });
        const res = await fetch(`/api/gbif/search?${params.toString()}`);
        if (!res.ok) throw new Error("GBIF search failed");
        return res.json();
      },
      enabled: effectiveQuery.length >= 2,
      staleTime: 60_000,
      retry: 1,
    },
  );

  const isDebouncing =
    hasMinimumQueryLength && debouncedQuery !== trimmedQuery;
  const results =
    !hasMinimumQueryLength || isDebouncing ? [] : (data?.results ?? []);
  const bestMatch = results.length > 0 ? results[0] : null;

  return {
    results,
    bestMatch,
    isLoading: hasMinimumQueryLength && (isDebouncing || isLoading),
    isDebouncing,
    error: error as Error | null,
  };
}
