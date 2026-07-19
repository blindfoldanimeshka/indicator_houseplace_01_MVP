// Удаление аккаунта и всех связанных данных (право субъекта 152-ФЗ).
// Вызывается только аутентифицированным пользователем для своего аккаунта.
// Каскадное удаление public.users + listings + messages настроено на уровне БД.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
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
    return new Response(JSON.stringify({ error: 'Invalid user' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
