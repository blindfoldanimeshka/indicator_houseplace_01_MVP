// Привязка Telegram-аккаунта к текущему пользователю.
// Принимает данные Telegram Login Widget, валидирует подпись по алгоритму
// https://core.telegram.org/widgets/login#checking-authorization
// и пишет telegram_id в public.users.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHmac, createHash, timingSafeEqual } from 'node:crypto'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

const MAX_AGE_SECONDS = 5 * 60

function computeCheckString(data: Record<string, string>): string {
  return Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n')
}

function verifyTelegramHash(data: TelegramUser, botToken: string): boolean {
  const secretKey = createHash('sha256').update(botToken).digest()
  const checkString = computeCheckString(data as unknown as Record<string, string>)
  const computed = createHmac('sha256', secretKey).update(checkString).digest('hex')

  const a = Buffer.from(computed)
  const b = Buffer.from(data.hash)
  return a.length === b.length && timingSafeEqual(a, b)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid user' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let payload: TelegramUser
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - payload.auth_date)
  if (ageSeconds > MAX_AGE_SECONDS) {
    return new Response(JSON.stringify({ ok: false, error: 'Auth expired' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!verifyTelegramHash(payload, botToken)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid hash' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await supabase
    .from('users')
    .update({ telegram_id: String(payload.id) })
    .eq('id', user.id)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, telegramId: payload.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
