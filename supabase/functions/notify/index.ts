// F6 Notifications dispatcher (Deno Edge Function).
//
// Reads a user's unread notifications + their notification_prefs and delivers
// them over the channels the user enabled:
//   - in-app: already persisted by DB triggers into public.notifications.
//   - telegram: real send via api.telegram.org (needs TELEGRAM_BOT_TOKEN
//     and a linked telegram_id on public.users).
//   - email: real send via Resend (needs RESEND_API_KEY + FROM_ADDRESS).
//
// This function is invoked by the client after relevant events, or by a cron
// job. It marks delivered notifications as read.
import { createClient } from 'npm:@supabase/supabase-js@2'

interface NotificationRow {
  id: string
  type: string
  payload: Record<string, unknown> | null
  read: boolean
}

interface PrefsRow {
  email_notif: boolean
  push_notif: boolean
  inapp_notif: boolean
}

const TELEGRAM_API = 'https://api.telegram.org'

function renderText(n: NotificationRow): string {
  const p = n.payload ?? {}
  switch (n.type) {
    case 'new_message':
      return `💬 Новое сообщение в чате:\n${(p.preview as string) ?? ''}`
    case 'new_chat':
      return `🏠 По вашему объявлению открыт новый чат.`
    case 'deal_closed':
      return `✅ Сделка закрыта.`
    default:
      return `У вас новое уведомление.`
  }
}

async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  return res.ok
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM') ?? 'noreply@paretovka.app'
  if (!key) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from, to, subject, text }),
  })
  return res.ok
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

  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const url = Deno.env.get('SUPABASE_URL')!
  const supabase = createClient(url, serviceRole, {
    global: { headers: { Authorization: authHeader } },
  })

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

  // Preferences (fall back to sensible defaults if none stored).
  const { data: prefsRow } = await supabase
    .from('notification_prefs')
    .select('email_notif, push_notif, inapp_notif')
    .eq('user_id', user.id)
    .maybeSingle()
  const prefs: PrefsRow = prefsRow ?? {
    email_notif: true,
    push_notif: false,
    inapp_notif: true,
  }

  // Unread notifications for this user.
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, type, payload, read')
    .eq('user_id', user.id)
    .eq('read', false)
    .order('created_at', { ascending: true })

  if (notifError) {
    return new Response(JSON.stringify({ ok: false, error: notifError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!notifications || notifications.length === 0) {
    return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Recipient contacts.
  const { data: profile } = await supabase
    .from('users')
    .select('telegram_id, email')
    .eq('id', user.id)
    .maybeSingle()

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const telegramChatId = profile?.telegram_id ?? null
  const email = (profile?.email as string | undefined) ?? user.email

  let delivered = 0
  const deliveredIds: string[] = []

  for (const n of notifications as NotificationRow[]) {
    let sentAny = false

    if (prefs.inapp_notif) {
      // in-app already persisted by triggers; count as delivered.
      sentAny = true
    }

    if (botToken && telegramChatId && prefs.push_notif) {
      const ok = await sendTelegram(botToken, telegramChatId, renderText(n))
      if (ok) sentAny = true
    }

    if (prefs.email_notif && email) {
      const ok = await sendEmail(email, 'Уведомление — напрямую', renderText(n))
      if (ok) sentAny = true
    }

    if (sentAny) {
      delivered += 1
      deliveredIds.push(n.id)
    }
  }

  // Mark delivered notifications as read (in-app stays read too).
  if (deliveredIds.length > 0) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', deliveredIds)
  }

  return new Response(
    JSON.stringify({ ok: true, delivered, total: notifications.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
