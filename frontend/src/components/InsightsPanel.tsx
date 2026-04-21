import type { InsightsData } from "../hooks/useInsights";

interface Props {
  data: InsightsData | undefined;
  isLoading: boolean;
  isError: boolean;
}

function buildLast14Days(byDay: { date: string; count: number }[]) {
  const countByDate = new Map(byDay.map((d) => [d.date, d.count]));
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
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
  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
    Insights
  </h2>
);

export default function InsightsPanel({ data, isLoading, isError }: Props) {
  if (isLoading) {
    return (
      <div>
        <Heading />
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
        <Heading />
        <p className="text-xs text-destructive">Unable to load insights.</p>
      </div>
    );
  }

  if (!data || data.totalSightings === 0) {
    return (
      <div>
        <Heading />
        <p className="text-xs text-muted-foreground">No data for current filters.</p>
      </div>
    );
  }

  return (
    <div>
      <Heading />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">
            Total sightings
          </p>
          <p className="text-xl font-semibold leading-tight">
            {data.totalSightings.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">
            Active individuals
          </p>
          <p className="text-xl font-semibold leading-tight">
            {data.byAnimal.length}
          </p>
        </div>
      </div>

      {data.byAnimal.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Top tracked individuals
          </p>
          <div className="space-y-1.5">
            {data.byAnimal.slice(0, 5).map((row) => (
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
            {data.byAnimal.length > 5 && (
              <p className="text-[10px] text-muted-foreground">
                +{data.byAnimal.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {data.byDay.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Daily trend
          </p>
          <DailyTrend byDay={data.byDay} />
          <p className="text-[10px] text-muted-foreground mt-1">Last 14 days</p>
        </div>
      )}
    </div>
  );
}
