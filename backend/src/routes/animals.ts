import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_SEARCH_LENGTH = 100

// Characters with special meaning in PostgREST filter expressions.
// Includes field/operator separator (.), quoting chars ('"'), and other syntax chars.
const POSTGREST_SPECIAL = /[().,*%_\\'"]/g

function sanitizeSearchTerm(raw: string): string {
  return raw.trim().slice(0, MAX_SEARCH_LENGTH).replace(POSTGREST_SPECIAL, '')
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // --- limit validation ---
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

    // --- search term sanitization ---
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

    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
})

router.get('/locations', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('sightings')
      .select('id, latitude, longitude, timestamp, animal_id')
      .limit(100)

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router;