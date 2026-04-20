import { useMemo, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { Check, Search, X } from "lucide-react";
import { useGbifSearch } from "@/hooks/useGbifSearch";
import type { DataSource } from "@/hooks/useMapFilters";
import type { GbifSearchResult } from "@/types/gbif";

interface Props {
  searchQuery: string;
  selectedSpecies: GbifSearchResult | null;
  onSearchChange: (q: string) => void;
  onGbifTaxonKeyChange: (key: number | null) => void;
  onDataSourceChange: (src: DataSource) => void;
  onBestMatchChange?: (match: GbifSearchResult | null) => void;
}

const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 6;

function normalizeValue(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getPrimaryLabel(result: GbifSearchResult) {
  return result.vernacularName?.trim() || result.canonicalName || result.scientificName;
}

function getScientificLabel(result: GbifSearchResult) {
  return result.canonicalName || result.scientificName;
}

export default function SpeciesSearch({
  searchQuery,
  selectedSpecies,
  onSearchChange,
  onGbifTaxonKeyChange,
  onDataSourceChange,
  onBestMatchChange,
}: Props) {
  const { results, isLoading } = useGbifSearch(searchQuery);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmedQuery = searchQuery.trim();
  const hasMinQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const suggestions = useMemo(
    () => results.slice(0, MAX_SUGGESTIONS),
    [results],
  );
  const selectedLabel = selectedSpecies ? getPrimaryLabel(selectedSpecies) : "";
  const clampedActiveIndex =
    suggestions.length > 0
      ? Math.min(activeIndex, suggestions.length - 1)
      : 0;
  const isSelectedQuery =
    selectedSpecies !== null &&
    normalizeValue(trimmedQuery) === normalizeValue(selectedLabel);

  const clearSelection = () => {
    onGbifTaxonKeyChange(null);
    onDataSourceChange(null);
    onBestMatchChange?.(null);
  };

  const handleClear = () => {
    onSearchChange("");
    clearSelection();
    setIsOpen(false);
    setActiveIndex(0);
  };

  const selectSuggestion = (result: GbifSearchResult) => {
    onSearchChange(getPrimaryLabel(result));
    onGbifTaxonKeyChange(result.key);
    onDataSourceChange("gbif");
    onBestMatchChange?.(result);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleInputChange = (value: string) => {
    onSearchChange(value);

    if (normalizeValue(value) !== normalizeValue(selectedLabel)) {
      clearSelection();
    }

    if (value.trim().length < MIN_QUERY_LENGTH) {
      setIsOpen(false);
      setActiveIndex(0);
      return;
    }

    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) =>
        index === 0 ? suggestions.length - 1 : index - 1,
      );
      return;
    }

    if (event.key === "Enter" && showDropdown) {
      event.preventDefault();
      selectSuggestion(suggestions[clampedActiveIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(0);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null;
    if (nextFocusedElement && containerRef.current?.contains(nextFocusedElement)) {
      return;
    }

    setIsOpen(false);
    setActiveIndex(0);
  };

  const showHint = trimmedQuery.length === 1;
  const showDropdown = hasMinQuery && isOpen && !isSelectedQuery;

  return (
    <div className="relative z-40">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Search Species
      </label>

      <div
        ref={containerRef}
        className="relative"
        onBlur={handleBlur}
      >
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Type any animal name..."
          value={searchQuery}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            if (hasMinQuery && !isSelectedQuery) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border bg-background py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          aria-autocomplete="list"
          aria-controls="species-search-suggestions"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-sm p-0.5 hover:bg-muted"
            aria-label="Clear search"
            type="button"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}

        {showDropdown && (
          <>
            {isLoading ? (
              <div
                role="status"
                className="absolute z-[70] mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs text-blue-500 shadow-md animate-pulse"
              >
                Searching GBIF...
              </div>
            ) : suggestions.length > 0 ? (
              <div
                id="species-search-suggestions"
                role="listbox"
                className="absolute z-[70] mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md"
              >
              <div className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((result, index) => {
                  const primaryLabel = getPrimaryLabel(result);
                  const scientificLabel = getScientificLabel(result);
                  const showScientificLabel =
                    normalizeValue(primaryLabel) !== normalizeValue(scientificLabel);

                  return (
                    <button
                      key={result.key}
                      type="button"
                      role="option"
                      aria-selected={index === clampedActiveIndex}
                      className={`flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors ${
                        index === clampedActiveIndex
                          ? "bg-muted"
                          : "hover:bg-muted/70"
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {primaryLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {showScientificLabel && (
                          <span className="italic">{scientificLabel}</span>
                        )}
                        {showScientificLabel && result.rank && " | "}
                        {result.rank}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>
            ) : (
              <div
                role="status"
                className="absolute z-[70] mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow-md"
              >
                No species found. Try a different name.
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-1.5 min-h-[1.25rem]">
        {showHint && (
          <p className="text-xs text-muted-foreground">
            Type at least 2 characters
          </p>
        )}

        {selectedSpecies && (
          <>
            <p className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3 shrink-0" />
              <span>
                Selected{" "}
                <span className="font-medium">{getPrimaryLabel(selectedSpecies)}</span>
              </span>
            </p>
            <button
              onClick={handleClear}
              className="mt-0.5 text-xs text-primary hover:underline"
              type="button"
            >
              Show all MoveBank data
            </button>
          </>
        )}
      </div>
    </div>
  );
}
