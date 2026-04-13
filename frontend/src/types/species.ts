export interface SpeciesDetail {
  id: string
  common_name: string
  scientific_name: string
  conservation_status: string | null
  description: string | null
  habitat: string | null
  range: string | null
  image_url: string | null
  wikipedia_url: string | null
  fun_facts: unknown | null
  population_estimate: string | null
}
