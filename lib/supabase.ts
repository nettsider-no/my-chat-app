import { createClient } from '@supabase/supabase-js'

const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKeyRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseUrl = supabaseUrlRaw?.trim()
const supabaseAnonKey = supabaseAnonKeyRaw?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to your environment.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)