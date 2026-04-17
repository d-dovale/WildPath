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
  summary: {
    conservation_status: {
      value: string | null
      source: 'wildpath_db' | 'api_ninjas' | 'pexels' | null
    }
    habitat: {
      value: string | null
      source: 'wildpath_db' | 'api_ninjas' | 'pexels' | null
    }
    range: {
      value: string | null
      source: 'wildpath_db' | 'api_ninjas' | 'pexels' | null
    }
  }
  animal_info: {
    taxonomy: {
      scientific_name: string | null
      class: string | null
      order: string | null
      family: string | null
      genus: string | null
    }
    locations: string[]
    characteristics: {
      habitat: string | null
      diet: string | null
      lifespan: string | null
      weight: string | null
      height: string | null
      top_speed: string | null
      estimated_population_size: string | null
      biggest_threat: string | null
    }
  } | null
  photo: {
    image_url: string
    alt: string | null
    photographer: string
    photographer_url: string
    pexels_url: string
    source: 'pexels'
  } | null
}
