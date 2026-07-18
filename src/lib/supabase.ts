import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnvironment } from '@/lib/env'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createClient<Database>> | undefined

export function getSupabaseClient() {
  if (!client) {
    const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = getSupabaseEnvironment()
    client = createClient<Database>(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
  }

  return client
}

