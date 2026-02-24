import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[WildPath] WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set.\n' +
      'Copy backend/.env.example to backend/.env and fill in your Supabase credentials.',
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'http://localhost',
  supabaseKey ?? 'placeholder',
)
