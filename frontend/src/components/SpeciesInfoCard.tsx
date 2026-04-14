import { useQuery } from '@tanstack/react-query'
import type { SpeciesDetail } from '@/types/species'

interface Props {
  speciesId: string
}

export default function SpeciesInfoCard({ speciesId }: Props) {
  const { data: species, isLoading, error } = useQuery<SpeciesDetail>({
    queryKey: ['species-detail', speciesId],
    queryFn: async () => {
      const res = await fetch(`/api/species/${speciesId}`)
      if (!res.ok) throw new Error('Failed to fetch species details')
      return res.json()
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })

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
    )
  }

  if (error || !species) return null

  const infoRows = [
    { label: 'Conservation Status', value: species.summary.conservation_status.value },
    { label: 'Habitat', value: species.summary.habitat.value },
    { label: 'Range', value: species.summary.range.value },
  ].filter((row) => row.value)

  const imageUrl = species.photo?.image_url ?? species.image_url

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={species.photo?.alt ?? species.common_name}
          className="w-full h-40 object-cover"
        />
      )}

      <div className="p-4">
        <h3 className="font-semibold text-base text-foreground">
          {species.common_name}
        </h3>
        <p className="text-sm text-muted-foreground italic mb-3">
          {species.scientific_name}
        </p>

        {infoRows.length > 0 && (
          <dl className="space-y-1.5">
            {infoRows.map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-foreground text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
