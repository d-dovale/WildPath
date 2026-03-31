import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import api from '@/services/api'

interface Species {
  id: string
  common_name: string
  scientific_name: string
}

interface Props {
  selectedSpeciesId: string | null
  onSelect: (speciesId: string | null) => void
}

export default function AnimalSelector({ selectedSpeciesId, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce search input by 300ms to avoid hammering the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: species = [], isLoading } = useQuery<Species[]>({
    queryKey: ['species', debouncedQuery],
    queryFn: async () => {
      const res = await api.get('/api/species', {
        params: { q: debouncedQuery || undefined, limit: 20 },
      })
      return res.data
    },
    enabled: open,
    staleTime: 1000 * 60,
  })

  // Close the dropdown when the user clicks outside the component
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedSpecies = species.find((s) => s.id === selectedSpeciesId)

  const handleSelect = (id: string) => {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    onSelect(null)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Species</label>

      {/* Show a pill with the selected species name, or the search input */}
      {selectedSpeciesId && selectedSpecies ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="flex-1 truncate">
            {selectedSpecies.common_name}{' '}
            <span className="text-muted-foreground italic">({selectedSpecies.scientific_name})</span>
          </span>
          <button onClick={handleClear} className="shrink-0 rounded-sm p-0.5 hover:bg-muted" aria-label="Clear species filter">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search species..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Dropdown results */}
      {open && !selectedSpeciesId && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {isLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          )}
          {!isLoading && species.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No species found</p>
          )}
          {!isLoading && species.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex flex-col"
            >
              <span className="font-medium">{s.common_name}</span>
              <span className="text-xs text-muted-foreground italic">{s.scientific_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
