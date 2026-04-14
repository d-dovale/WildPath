import { Button } from "@/components/ui/button";
import type { YearPreset } from "@/hooks/useMapFilters";

const presets: { key: YearPreset; label: string }[] = [
  { key: "5y", label: "Last 5 years" },
  { key: "10y", label: "Last 10 years" },
  { key: "all", label: "All time" },
];

interface Props {
  value: YearPreset;
  onChange: (preset: YearPreset) => void;
}

export default function GbifYearFilter({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        Year Range
      </label>
      <div className="flex gap-1">
        {presets.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={value === p.key ? "default" : "outline"}
            onClick={() => onChange(p.key)}
            className="flex-1 text-xs"
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
