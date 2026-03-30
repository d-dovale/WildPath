import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { parseSightingsFilters } from '../lib/parseSightingsFilters'

const router = Router()

const DEFAULT_LIMIT = 1000
const MAX_LIMIT = 5000

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // --- limit ---
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

    const parsedFilters = parseSightingsFilters(req.query)
    if (!parsedFilters.ok) {
      res.status(parsedFilters.status).json(parsedFilters.body)
      return
    }
    const { species_id, bbox, start, end } = parsedFilters

    // Two select shapes keep Supabase TypeScript inference stable:
    // - with species_id: inner join animals for filtering
    // - without: no join (avoids unnecessary work)
    if (species_id) {
      let query = supabase
        .from('sightings')
        .select('id, animal_id, latitude, longitude, timestamp, animals!inner(species_id)')
        .order('timestamp', { ascending: true })
        .limit(limit)
        .eq('animals.species_id', species_id)

      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox
        query = query
          .gte('longitude', minLng)
          .lte('longitude', maxLng)
          .gte('latitude', minLat)
          .lte('latitude', maxLat)
      }

      if (start) {
        query = query.gte('timestamp', start)
      }

      if (end) {
        query = query.lte('timestamp', end)
      }

      const { data, error } = await query

      if (error) {
        next(error)
        return
      }

      const rows = (data ?? []).map(({ animals: _animals, ...rest }) => rest)
      res.json(rows)
    } else {
      let query = supabase
        .from('sightings')
        .select('id, animal_id, latitude, longitude, timestamp')
        .order('timestamp', { ascending: true })
        .limit(limit)

      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox
        query = query
          .gte('longitude', minLng)
          .lte('longitude', maxLng)
          .gte('latitude', minLat)
          .lte('latitude', maxLat)
      }

      if (start) {
        query = query.gte('timestamp', start)
      }

      if (end) {
        query = query.lte('timestamp', end)
      }

      const { data, error } = await query

      if (error) {
        next(error)
        return
      }

      res.json(data ?? [])
    }
  } catch (err) {
    next(err)
  }
})

export default router
