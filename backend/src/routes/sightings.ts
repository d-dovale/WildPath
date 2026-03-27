import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

const DEFAULT_LIMIT = 1000
const MAX_LIMIT = 5000

// Basic UUID format check — prevents obviously bad values reaching PostgREST.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    // --- speciesId ---
    const speciesIdParam = req.query.speciesId
    let speciesId: string | undefined
    if (speciesIdParam !== undefined) {
      if (typeof speciesIdParam !== 'string' || !UUID_RE.test(speciesIdParam.trim())) {
        res.status(400).json({ error: 'speciesId must be a valid UUID' })
        return
      }
      speciesId = speciesIdParam.trim()
    }

    // --- bbox (minLng,minLat,maxLng,maxLat) ---
    const bboxParam = req.query.bbox
    let bbox: [number, number, number, number] | undefined
    if (bboxParam !== undefined) {
      if (typeof bboxParam !== 'string') {
        res.status(400).json({ error: 'Invalid bbox parameter' })
        return
      }
      const parts = bboxParam.split(',').map(Number)
      if (
        parts.length !== 4 ||
        parts.some(isNaN) ||
        parts[0] < -180 || parts[0] > 180 ||
        parts[2] < -180 || parts[2] > 180 ||
        parts[1] < -90  || parts[1] > 90  ||
        parts[3] < -90  || parts[3] > 90
      ) {
        res.status(400).json({ error: 'bbox must be four numbers: minLng,minLat,maxLng,maxLat' })
        return
      }
      bbox = parts as [number, number, number, number]
    }

    // --- start / end ---
    const startParam = req.query.start
    let start: string | undefined
    if (startParam !== undefined) {
      if (typeof startParam !== 'string' || isNaN(Date.parse(startParam))) {
        res.status(400).json({ error: 'start must be a valid ISO 8601 date string' })
        return
      }
      start = startParam
    }

    const endParam = req.query.end
    let end: string | undefined
    if (endParam !== undefined) {
      if (typeof endParam !== 'string' || isNaN(Date.parse(endParam))) {
        res.status(400).json({ error: 'end must be a valid ISO 8601 date string' })
        return
      }
      end = endParam
    }

    // --- build query ---
    // Always join animals so the speciesId filter can reference animals.species_id.
    // Using a static select string keeps the Supabase TypeScript inference stable.
    let query = supabase
      .from('sightings')
      .select('id, animal_id, latitude, longitude, timestamp, animals!inner(species_id)')
      .order('timestamp', { ascending: true })
      .limit(limit)

    if (speciesId) {
      query = query.eq('animals.species_id', speciesId)
    }

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

    // Strip the joined animals object from each row — it was only needed for filtering.
    const rows = (data ?? []).map(({ animals: _animals, ...rest }) => rest)

    res.json(rows)
  } catch (err) {
    next(err)
  }
})

export default router
