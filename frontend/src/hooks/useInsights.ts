import { useQuery } from "@tanstack/react-query";

export type InsightsData = {
  totalSightings: number;
  byAnimal: {
    animal_id: string;
    animal_name: string | null;
    species_common_name: string | null;
    count: number;
  }[];
  byDay: { date: string; count: number }[];
};

export function useInsights(queryParams: Record<string, string>, enabled = true) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(queryParams).filter(([k]) => k !== "limit")),
  ).toString();

  return useQuery<InsightsData>({
    queryKey: ["insights", qs],
    queryFn: async () => {
      const res = await fetch(`/api/insights${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
