import { Button } from '@/components/ui/button'
import type { TimePreset } from '@/hooks/useMapFilters'

const presets: { key: TimePreset; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
]

interface Props {
  value: TimePreset
  onChange: (preset: TimePreset) => void
}

export default function TimeRangeFilter({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        Time Range
      </label>
      <div className="grid grid-cols-3 gap-1">
        {presets.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={value === p.key ? 'default' : 'outline'}
            onClick={() => onChange(p.key)}
            className="h-auto min-w-0 whitespace-normal px-2 py-2 text-[11px] leading-tight"
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
