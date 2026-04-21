import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { parseSightingsFilters } from '../lib/parseSightingsFilters'

const router = Router()


/**
 * RPC returns bigint counts in JSON; the client parses them as JS `number`, which only preserves
 * integers exactly up to `Number.MAX_SAFE_INTEGER` (2^53 − 1). Fine for MVP-scale aggregates; if
 * counts could exceed that (e.g. billions), return counts as strings from SQL or another safe format.
 */

type AnimalRow = {
  animal_id: string
  animal_name: string | null
  species_common_name: string | null
  count: number
}

type InsightsPayload = {
  totalSightings: number
  byAnimal: AnimalRow[]
  byDay: { date: string; count: number }[]
}

async function enrichWithNames(rows: AnimalRow[]): Promise<AnimalRow[]> {
  const ids = rows.map((r) => r.animal_id)
  const { data: animals } = await supabase
    .from('animals')
    .select('id, name, species:species_id(common_name)')
    .in('id', ids)
  const infoMap = new Map(
    (animals ?? []).map((a) => [
      a.id,
      {
        name: a.name as string | null,
        common_name: (a.species as unknown as { common_name: string } | null)?.common_name ?? null,
      },
    ])
  )
  return rows.map((row) => ({
    ...row,
    animal_name: row.animal_name ?? infoMap.get(row.animal_id)?.name ?? null,
    species_common_name: row.species_common_name ?? infoMap.get(row.animal_id)?.common_name ?? null,
  }))
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = parseSightingsFilters(req.query)
    if (!parsed.ok) {
      res.status(parsed.status).json(parsed.body)
      return
    }

    const { species_id, bbox, start, end } = parsed

    const { data, error } = await supabase.rpc('api_insights', {
      p_species_id: species_id ?? null,
      p_min_lng: bbox ? bbox[0] : null,
      p_min_lat: bbox ? bbox[1] : null,
      p_max_lng: bbox ? bbox[2] : null,
      p_max_lat: bbox ? bbox[3] : null,
      p_start: start ?? null,
      p_end: end ?? null,
    })

    if (error) {
      next(error)
      return
    }

    const payload = data as InsightsPayload

    if (payload.byAnimal?.length > 0 && payload.byAnimal[0].animal_name === undefined) {
      payload.byAnimal = await enrichWithNames(payload.byAnimal)
    }

    res.json(payload)
  } catch (err) {
    next(err)
  }
})

export default router
