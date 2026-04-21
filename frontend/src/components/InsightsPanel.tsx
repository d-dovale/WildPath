import type { InsightsData } from "../hooks/useInsights";

export interface GbifInsightsData {
  totalOccurrences: number;
  countriesCount: number;
  sampleSize: number;
  hasMoreResults: boolean;
  latestDate: string | null;
  byDay: { date: string; count: number }[];
  byBasis: { label: string; count: number }[];
}

interface Props {
  source: "movebank" | "gbif";
  data: InsightsData | GbifInsightsData | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  contextLabel?: string | null;
}

function buildLast14Days(byDay: { date: string; count: number }[]) {
  if (byDay.length === 0) {
    return [];
  }

  const countByDate = new Map(byDay.map((d) => [d.date, d.count]));
  const latestDate = byDay.reduce((latest, entry) => {
    return entry.date > latest ? entry.date : latest;
  }, byDay[0].date);

  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${latestDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (13 - i));
    const date = d.toISOString().slice(0, 10);
    return { date, count: countByDate.get(date) ?? 0 };
  });
}

function DailyTrend({ byDay }: { byDay: { date: string; count: number }[] }) {
  const days = buildLast14Days(byDay);
  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-10 w-full">
      {days.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${day.count}`}
          className={`flex-1 rounded-sm transition-colors cursor-default ${
            day.count === 0 ? "bg-muted/30" : "bg-primary/50 hover:bg-primary/80"
          }`}
          style={{ height: `${Math.max(Math.round((day.count / max) * 100), 4)}%` }}
        />
      ))}
    </div>
  );
}

const Heading = () => (
  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Insights
  </h2>
);

function SourceBadge({ source }: { source: "movebank" | "gbif" }) {
  const className =
    source === "gbif"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${className}`}
    >
      {source === "gbif" ? "GBIF" : "MoveBank"}
    </span>
  );
}

export default function InsightsPanel({
  source,
  data,
  isLoading,
  isRefreshing,
  isError,
  contextLabel,
}: Props) {
  const isGbif = source === "gbif";

  if (isLoading && !data) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Heading />
          <SourceBadge source={source} />
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-10 rounded-xl bg-muted/30" />
          <div className="h-10 rounded-xl bg-muted/30" />
          <div className="h-8 rounded-xl bg-muted/30 mt-4" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Heading />
          <SourceBadge source={source} />
        </div>
        <p className="text-xs text-destructive">
          {isGbif ? "Unable to load GBIF insights." : "Unable to load insights."}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Heading />
          <SourceBadge source={source} />
        </div>
        <p className="text-xs text-muted-foreground">
          {isGbif ? "Search for a GBIF species to see insights." : "No data for current filters."}
        </p>
      </div>
    );
  }

  if (!isGbif && (data as InsightsData).totalSightings === 0) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Heading />
          <SourceBadge source={source} />
        </div>
        <p className="text-xs text-muted-foreground">No data for current filters.</p>
      </div>
    );
  }

  if (isGbif && (data as GbifInsightsData).totalOccurrences === 0) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Heading />
          <SourceBadge source={source} />
        </div>
        <p className="text-xs text-muted-foreground">No GBIF occurrences for current filters.</p>
      </div>
    );
  }

  if (isGbif) {
    const gbifData = data as GbifInsightsData;

    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heading />
            <SourceBadge source={source} />
          </div>
          {isRefreshing && <span className="text-[10px] text-muted-foreground">Updating...</span>}
        </div>

        {contextLabel && (
          <p className="mb-4 text-[10px] uppercase tracking-wider text-muted-foreground">
            {contextLabel}
          </p>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">
              Total occurrences
            </p>
            <p className="text-xl font-semibold leading-tight">
              {gbifData.totalOccurrences.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">
              Countries
            </p>
            <p className="text-xl font-semibold leading-tight">
              {gbifData.countriesCount.toLocaleString()}
            </p>
          </div>
        </div>

        {gbifData.byBasis.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Record types
            </p>
            <div className="space-y-1.5">
              {gbifData.byBasis.slice(0, 5).map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="truncate text-foreground/80 font-medium text-xs">
                    {row.label}
                  </span>
                  <span className="text-foreground/80 font-medium text-xs">
                    {row.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gbifData.byDay.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Occurrence trend
            </p>
            <DailyTrend byDay={gbifData.byDay} />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Latest 14 days in loaded results
            </p>
          </div>
        )}

        <div className="mt-4 space-y-1 text-[10px] text-muted-foreground">
          <p>
            Loaded {gbifData.sampleSize.toLocaleString()} result
            {gbifData.sampleSize === 1 ? "" : "s"} for panel details.
          </p>
          {gbifData.hasMoreResults && (
            <p>Totals may exceed the loaded map sample.</p>
          )}
          {gbifData.latestDate && <p>Latest occurrence: {gbifData.latestDate}</p>}
        </div>
      </div>
    );
  }

  const movebankData = data as InsightsData;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Heading />
          <SourceBadge source={source} />
        </div>
        {isRefreshing && <span className="text-[10px] text-muted-foreground">Updating...</span>}
      </div>

      {contextLabel && (
        <p className="mb-4 text-[10px] uppercase tracking-wider text-muted-foreground">
          {contextLabel}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">
            Total sightings
          </p>
          <p className="text-xl font-semibold leading-tight">
            {movebankData.totalSightings.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">
            Active individuals
          </p>
          <p className="text-xl font-semibold leading-tight">
            {movebankData.byAnimal.length}
          </p>
        </div>
      </div>

      {movebankData.byAnimal.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Top tracked individuals
          </p>
          <div className="space-y-1.5">
            {movebankData.byAnimal.slice(0, 5).map((row) => (
              <div key={row.animal_id} className="flex items-center justify-between gap-2">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate text-foreground/80 font-medium text-xs">
                    {row.species_common_name || row.animal_id}
                  </span>
                  {row.animal_name && (
                    <span className="truncate text-muted-foreground text-[10px]">
                      {row.animal_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-foreground/80 font-medium text-xs">
                    {row.count.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-[10px]">sightings</span>
                </div>
              </div>
            ))}
            {movebankData.byAnimal.length > 5 && (
              <p className="text-[10px] text-muted-foreground">
                +{movebankData.byAnimal.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {movebankData.byDay.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Daily trend
          </p>
          <DailyTrend byDay={movebankData.byDay} />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Latest 14 days in results
          </p>
        </div>
      )}
    </div>
  );
}
