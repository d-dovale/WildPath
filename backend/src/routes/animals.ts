import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_SEARCH_LENGTH = 100

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, MAX_SEARCH_LENGTH) : undefined
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : DEFAULT_LIMIT
    const limit = Math.min(Number.isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw, MAX_LIMIT)

    let query = supabase
      .from('species')
      .select('id, common_name, scientific_name')
      .order('common_name', { ascending: true })
      .limit(limit)

    if (q && q.length > 0) {
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

export default router
