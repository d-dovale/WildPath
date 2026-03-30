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
type InsightsPayload = {
  totalSightings: number
  byAnimal: { animal_id: string; count: number }[]
  byDay: { date: string; count: number }[]
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

    res.json(data as InsightsPayload)
  } catch (err) {
    next(err)
  }
})

export default router
