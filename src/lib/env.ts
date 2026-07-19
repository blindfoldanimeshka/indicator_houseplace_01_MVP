import { z } from 'zod'

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_YANDEX_MAPS_KEY: z.string().min(1).optional(),
})

const parsedEnvironment = environmentSchema.safeParse(import.meta.env)

export function isSupabaseConfigured(): boolean {
  return parsedEnvironment.success
}

export function getSupabaseEnvironment() {
  if (!parsedEnvironment.success) {
    throw new Error(
      'Supabase не настроен. Заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.',
    )
  }

  return parsedEnvironment.data
}

export function getYandexMapsKey(): string | undefined {
  return parsedEnvironment.data?.VITE_YANDEX_MAPS_KEY
}

