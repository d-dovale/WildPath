import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { fetchAnimalInfo } from '../lib/fetchAnimalInfo'
import { fetchSpeciesPhoto } from '../lib/fetchSpeciesPhoto'
import { isUuid } from '../lib/isUuid'
import {
  FULL_SPECIES_DETAILS_TTL_MS,
  getSpeciesDetailsFromCache,
  PARTIAL_SPECIES_DETAILS_TTL_MS,
  setSpeciesDetailsInCache,
} from '../lib/speciesDetailsCache'
import { supabase } from '../lib/supabase'
import type { SpeciesDetailsResponse, SpeciesDetailsSpeciesRow, SpeciesListItem } from '../types'

const router = Router()

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_SEARCH_LENGTH = 100
const SPECIES_DETAIL_SELECT =
  'id, common_name, scientific_name, description, conservation_status, habitat, fun_facts, population_estimate'

// Characters with special meaning in PostgREST filter expressions.
// Includes field/operator separator (.), quoting chars ('"'), and other syntax chars.
const POSTGREST_SPECIAL = /[().,*%_\\'"]/g

function sanitizeSearchTerm(raw: string): string {
  return raw.trim().slice(0, MAX_SEARCH_LENGTH).replace(POSTGREST_SPECIAL, '')
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limitParam = req.query.limit
    let limit = DEFAULT_LIMIT
    if (limitParam !== undefined) {
      if (typeof limitParam !== 'string') {
        res.status(400).json({ error: 'Invalid limit parameter' })
        return
      }
      if (!/^\d+$/.test(limitParam.trim())) {
        res.status(400).json({ error: 'limit must be a positive integer' })
        return
      }
      const parsed = Number(limitParam.trim())
      if (!Number.isInteger(parsed) || parsed < 1) {
        res.status(400).json({ error: 'limit must be a positive integer' })
        return
      }
      limit = Math.min(parsed, MAX_LIMIT)
    }

    const qParam = req.query.q
    let q: string | undefined
    if (qParam !== undefined) {
      if (typeof qParam !== 'string') {
        res.status(400).json({ error: 'Invalid q parameter' })
        return
      }
      const sanitized = sanitizeSearchTerm(qParam)
      if (sanitized.length > 0) {
        q = sanitized
      }
    }

    let query = supabase
      .from('species')
      .select('id, common_name, scientific_name')
      .order('common_name', { ascending: true })
      .limit(limit)

    if (q) {
      query = query.or(`common_name.ilike.%${q}%,scientific_name.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      next(error)
      return
    }

    res.json((data ?? []) as SpeciesListItem[])
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawSpeciesId = req.params.id
    const speciesId = typeof rawSpeciesId === 'string' ? rawSpeciesId.trim() : undefined
    if (!speciesId || !isUuid(speciesId)) {
      res.status(400).json({ error: 'species id must be a valid UUID' })
      return
    }

    const cached = getSpeciesDetailsFromCache(speciesId)
    if (cached) {
      res.json(cached)
      return
    }

    const { data, error } = await supabase
      .from('species')
      .select(SPECIES_DETAIL_SELECT)
      .eq('id', speciesId)
      .maybeSingle()

    if (error) {
      next(error)
      return
    }

    if (!data) {
      res.status(404).json({ error: 'Species not found' })
      return
    }

    const species = data as SpeciesDetailsSpeciesRow
    const [animalInfo, photo] = await Promise.all([
      fetchAnimalInfo(species),
      fetchSpeciesPhoto(species),
    ])

    const normalizedRange =
      animalInfo && animalInfo.locations.length > 0 ? animalInfo.locations.join(', ') : null

    const response: SpeciesDetailsResponse = {
      ...species,
      range: normalizedRange,
      image_url: photo?.image_url ?? null,
      wikipedia_url: null,
      summary: {
        conservation_status: {
          value: species.conservation_status,
          source: species.conservation_status ? 'wildpath_db' : null,
        },
        habitat: {
          value: species.habitat ?? animalInfo?.characteristics.habitat ?? null,
          source: species.habitat ? 'wildpath_db' : animalInfo?.characteristics.habitat ? 'api_ninjas' : null,
        },
        range: {
          value: normalizedRange,
          source: normalizedRange ? 'api_ninjas' : null,
        },
      },
      animal_info: animalInfo,
      photo,
    }

    const enrichmentComplete = animalInfo !== null && photo !== null
    setSpeciesDetailsInCache(
      speciesId,
      response,
      enrichmentComplete ? FULL_SPECIES_DETAILS_TTL_MS : PARTIAL_SPECIES_DETAILS_TTL_MS,
    )
    res.json(response)
  } catch (err) {
    next(err)
  }
})

export default router
