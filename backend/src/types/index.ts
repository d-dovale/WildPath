export interface SpeciesListItem {
  id: string
  common_name: string
  scientific_name: string
}

export interface SpeciesDetailsSpeciesRow extends SpeciesListItem {
  description: string | null
  conservation_status: string | null
  habitat: string | null
  fun_facts: unknown
  population_estimate: string | null
}

export type SpeciesDetailsSource = 'wildpath_db' | 'api_ninjas' | 'pexels'

export interface SpeciesSummaryField {
  value: string | null
  source: SpeciesDetailsSource | null
}

export interface SpeciesDetailsSummary {
  conservation_status: SpeciesSummaryField
  habitat: SpeciesSummaryField
  range: SpeciesSummaryField
}

export interface SpeciesDetailsTaxonomy {
  scientific_name: string | null
  class: string | null
  order: string | null
  family: string | null
  genus: string | null
}

export interface SpeciesDetailsCharacteristics {
  habitat: string | null
  diet: string | null
  lifespan: string | null
  weight: string | null
  height: string | null
  top_speed: string | null
  estimated_population_size: string | null
  biggest_threat: string | null
}

export interface SpeciesDetailsAnimalInfo {
  taxonomy: SpeciesDetailsTaxonomy
  locations: string[]
  characteristics: SpeciesDetailsCharacteristics
}

export interface SpeciesDetailsPhoto {
  image_url: string
  alt: string | null
  photographer: string
  photographer_url: string
  pexels_url: string
  source: 'pexels'
}

export interface SpeciesDetailsResponse extends SpeciesDetailsSpeciesRow {
  summary: SpeciesDetailsSummary
  animal_info: SpeciesDetailsAnimalInfo | null
  photo: SpeciesDetailsPhoto | null
}
