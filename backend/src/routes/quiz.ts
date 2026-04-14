import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { enrichSpecies } from '../lib/enrichSpecies'

const router = Router()

const DEFAULT_COUNT = 5
const MAX_COUNT = 10
const CHOICES_PER_QUESTION = 4

interface SpeciesRow {
  id: string
  common_name: string
  scientific_name: string
  image_url: string | null
}

export interface QuizQuestion {
  questionNumber: number
  imageUrl: string
  correctId: string
  choices: { id: string; common_name: string }[]
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countParam = req.query.count
    let count = DEFAULT_COUNT
    if (countParam !== undefined) {
      if (typeof countParam !== 'string' || !/^\d+$/.test(countParam.trim())) {
        res.status(400).json({ error: 'count must be a positive integer' })
        return
      }
      count = Math.min(Math.max(1, Number(countParam.trim())), MAX_COUNT)
    }

    const needed = count * CHOICES_PER_QUESTION

    // Step 1: fetch all species regardless of image status
    const { data: allSpecies, error: allError } = await supabase
      .from('species')
      .select('id, common_name, scientific_name, image_url')
      .not('common_name', 'is', null)
      .not('scientific_name', 'is', null)
      .limit(200)

    if (allError) { next(allError); return }

    const all = (allSpecies ?? []) as SpeciesRow[]

    const withImage = all.filter(s => s.image_url)
    const withoutImage = all.filter(s => !s.image_url)

    // Step 2: if we don't have enough with images, enrich some now
    if (withImage.length < needed) {
      const toEnrich = withoutImage.slice(0, needed - withImage.length)

      const results = await Promise.allSettled(
        toEnrich.map(s => enrichSpecies(s.id, s.scientific_name))
      )

      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.image_url) {
          withImage.push({ ...toEnrich[i], image_url: result.value.image_url })
        }
      })
    }

    if (withImage.length < CHOICES_PER_QUESTION) {
      res.status(503).json({
        error: `Only ${withImage.length} species with images found — need at least ${CHOICES_PER_QUESTION}. Check that iNaturalist enrichment is working.`,
      })
      return
    }

    shuffle(withImage)

    const questions: QuizQuestion[] = []
    const usedAsCorrect = new Set<string>()

    for (let i = 0; i < count; i++) {
      const correct = withImage.find(s => !usedAsCorrect.has(s.id))
      if (!correct) break
      usedAsCorrect.add(correct.id)

      const distractors = withImage
        .filter(s => s.id !== correct.id && !usedAsCorrect.has(s.id))
        .slice(0, CHOICES_PER_QUESTION - 1)

      if (distractors.length < CHOICES_PER_QUESTION - 1) break

      const choices = shuffle([
        { id: correct.id, common_name: correct.common_name },
        ...distractors.map(s => ({ id: s.id, common_name: s.common_name })),
      ])

      questions.push({
        questionNumber: i + 1,
        imageUrl: correct.image_url!,
        correctId: correct.id,
        choices,
      })
    }

    if (questions.length === 0) {
      res.status(503).json({ error: 'Could not generate quiz questions.' })
      return
    }

    res.json({ total: questions.length, questions })
  } catch (err) {
    next(err)
  }
})

export default router
