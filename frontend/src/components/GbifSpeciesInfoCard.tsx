import { useQuery } from "@tanstack/react-query";
import type { GbifSpeciesDetail } from "@/types/gbif";

interface Props {
  taxonKey: number;
  vernacularNameOverride?: string;
}

const IUCN_COLORS: Record<string, string> = {
  LC: "bg-green-100 text-green-800",
  NT: "bg-lime-100 text-lime-800",
  VU: "bg-yellow-100 text-yellow-800",
  EN: "bg-orange-100 text-orange-800",
  CR: "bg-red-100 text-red-800",
  EW: "bg-purple-100 text-purple-800",
  EX: "bg-gray-100 text-gray-800",
  DD: "bg-slate-100 text-slate-600",
};

const IUCN_LABELS: Record<string, string> = {
  LC: "Least Concern",
  NT: "Near Threatened",
  VU: "Vulnerable",
  EN: "Endangered",
  CR: "Critically Endangered",
  EW: "Extinct in Wild",
  EX: "Extinct",
  DD: "Data Deficient",
  NE: "Not Evaluated",
};

export default function GbifSpeciesInfoCard({
  taxonKey,
  vernacularNameOverride,
}: Props) {
  const {
    data: species,
    isLoading,
    error,
  } = useQuery<GbifSpeciesDetail>({
    queryKey: ["gbif-species-detail", taxonKey],
    queryFn: async () => {
      const res = await fetch(`/api/gbif/species/${taxonKey}`);
      if (!res.ok) throw new Error("Failed to fetch GBIF species details");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
        <div className="h-40 bg-muted" />
        <div className="p-4 space-y-3">
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !species) return null;

  // Prefer enriched imageUrl, fall back to GBIF media array
  const imageUrl =
    species.imageUrl ??
    species.media.find((m) => m.type === "StillImage" && m.identifier)
      ?.identifier;

  const displayName =
    vernacularNameOverride ??
    species.vernacularName ??
    species.canonicalName ??
    species.scientificName;

  const iucn = species.iucnRedListCategory;
  const iucnColor = iucn
    ? (IUCN_COLORS[iucn] ?? "bg-slate-100 text-slate-600")
    : null;
  const iucnLabel = iucn ? (IUCN_LABELS[iucn] ?? iucn) : null;

  const taxonomyParts = [
    species.kingdom,
    species.phylum,
    species.class,
    species.order,
    species.family,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={displayName}
          className="w-full h-40 object-cover"
        />
      )}

      <div className="p-4">
        <h3 className="font-semibold text-base text-foreground">
          {displayName}
        </h3>
        <p className="text-sm text-muted-foreground italic mb-2">
          {species.scientificName}
        </p>

        {iucnColor && iucnLabel && (
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${iucnColor}`}
          >
            {iucnLabel}
          </span>
        )}

        {species.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
            {species.description}
          </p>
        )}

        {taxonomyParts.length > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            {taxonomyParts.join(" > ")}
          </p>
        )}

        <div className="flex justify-between text-sm mt-1.5">
          <span className="text-muted-foreground">Source</span>
          <a
            href={`https://www.gbif.org/species/${taxonKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            GBIF
          </a>
        </div>
      </div>
    </div>
  );
}
