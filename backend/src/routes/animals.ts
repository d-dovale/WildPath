import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('animals').select('*')
    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get('/locations', async (_req, res, next) => {
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

export default router