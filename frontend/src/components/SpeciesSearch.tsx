import { useEffect, useRef } from "react";
import { Search, X, Check } from "lucide-react";
import { useGbifSearch } from "@/hooks/useGbifSearch";
import type { DataSource } from "@/hooks/useMapFilters";
import type { GbifSearchResult } from "@/types/gbif";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onGbifTaxonKeyChange: (key: number | null) => void;
  onDataSourceChange: (src: DataSource) => void;
  onBestMatchChange?: (match: GbifSearchResult | null) => void;
}

export default function SpeciesSearch({
  searchQuery,
  onSearchChange,
  onGbifTaxonKeyChange,
  onDataSourceChange,
  onBestMatchChange,
}: Props) {
  const { bestMatch, isLoading } = useGbifSearch(searchQuery);
  const prevMatchKeyRef = useRef<number | null>(null);

  // Auto-select best match when it changes
  useEffect(() => {
    const newKey = bestMatch?.key ?? null;
    if (newKey === prevMatchKeyRef.current) return;
    prevMatchKeyRef.current = newKey;

    onBestMatchChange?.(bestMatch);

    if (newKey !== null) {
      onGbifTaxonKeyChange(newKey);
      onDataSourceChange("gbif");
    }
  }, [bestMatch, onGbifTaxonKeyChange, onDataSourceChange, onBestMatchChange]);

  const handleClear = () => {
    onSearchChange("");
    onGbifTaxonKeyChange(null);
    onDataSourceChange(null);
    onBestMatchChange?.(null);
    prevMatchKeyRef.current = null;
  };

  const showSearching = isLoading && searchQuery.trim().length >= 2;
  const showMatch =
    !isLoading && bestMatch !== null && searchQuery.trim().length >= 2;
  const showNoMatch =
    !isLoading && bestMatch === null && searchQuery.trim().length >= 2;
  const showHint = searchQuery.trim().length === 1;

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        Search Species
      </label>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Type any animal name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-md border bg-background py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-sm p-0.5 hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Status line */}
      <div className="mt-1.5 min-h-[1.25rem]">
        {showSearching && (
          <p className="text-xs text-blue-500 animate-pulse">
            Searching GBIF...
          </p>
        )}

        {showMatch && (
          <>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3 shrink-0" />
              <span>
                {bestMatch.vernacularName && (
                  <span className="font-medium">
                    {bestMatch.vernacularName} —{" "}
                  </span>
                )}
                <span className="italic">
                  {bestMatch.canonicalName ?? bestMatch.scientificName}
                </span>
              </span>
            </p>
            <button
              onClick={handleClear}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              &larr; Show all MoveBank data
            </button>
          </>
        )}

        {showNoMatch && (
          <p className="text-xs text-muted-foreground">
            No species found. Try a different name.
          </p>
        )}

        {showHint && (
          <p className="text-xs text-muted-foreground">
            Type at least 2 characters
          </p>
        )}
      </div>
    </div>
  );
}
