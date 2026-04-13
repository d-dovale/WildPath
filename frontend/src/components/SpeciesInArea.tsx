import type { Sighting } from '@/types/sighting'

interface SpeciesCount {
  species_id: string
  common_name: string
  scientific_name: string
  count: number
}

interface Props {
  sightings: Sighting[] | undefined
  onSelectSpecies: (speciesId: string) => void
  selectedSpeciesId: string | null
}

function extractSpecies(sightings: Sighting[]): SpeciesCount[] {
  const map = new Map<string, SpeciesCount>()
  for (const s of sightings) {
    if (!s.species_id || !s.common_name) continue
    const existing = map.get(s.species_id)
    if (existing) {
      map.set(s.species_id, { ...existing, count: existing.count + 1 })
    } else {
      map.set(s.species_id, {
        species_id: s.species_id,
        common_name: s.common_name,
        scientific_name: s.scientific_name ?? '',
        count: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export default function SpeciesInArea({ sightings, onSelectSpecies, selectedSpeciesId }: Props) {
  if (!sightings || sightings.length === 0) return null

  const speciesList = extractSpecies(sightings)
  if (speciesList.length === 0) return null

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Species in Area
      </h2>
      <div className="space-y-1">
        {speciesList.map((sp) => (
          <button
            key={sp.species_id}
            onClick={() => onSelectSpecies(sp.species_id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedSpeciesId === sp.species_id
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            }`}
          >
            <div className="flex justify-between items-baseline">
              <span className="font-medium">{sp.common_name}</span>
              <span className="text-xs text-muted-foreground">{sp.count} sightings</span>
            </div>
            <span className="text-xs text-muted-foreground italic">{sp.scientific_name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
