import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { profileSchema } from '@/features/profile/profileSchema'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'

export function PersonalInfoTab() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [formError, setFormError] = useState<string | null>(null)

  // Load the profile from the `users` table (the save target), not from
  // user_metadata — those can diverge and make saves look like they didn't stick.
  useEffect(() => {
    if (!user) return
    let active = true
    getSupabaseClient()
      .from('users')
      .select('name, city, avatar_path')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return
        setName(data.name ?? '')
        setCity(data.city ?? '')
        setAvatarPath(data.avatar_path ?? null)
      })
    return () => {
      active = false
    }
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('idle')
    setFormError(null)
    setErrors({})

    const parsed = profileSchema.safeParse({ name, city })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setStatus('saving')
    const result = await updateProfile({
      name: parsed.data.name,
      city: parsed.data.city || '',
      avatarPath,
    })

    if (result.error) {
      setFormError(result.error)
      setStatus('error')
      return
    }

    // Re-read the persisted row so the form reflects what's actually stored.
    const { data } = await getSupabaseClient()
      .from('users')
      .select('name, city, avatar_path')
      .eq('id', user!.id)
      .maybeSingle()
    if (data) {
      setName(data.name ?? '')
      setCity(data.city ?? '')
      setAvatarPath(data.avatar_path ?? null)
    }
    setStatus('saved')
  }

  return (
    <section className="space-y-4">
      {!user?.email_confirmed_at && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Подтвердите email, чтобы публиковать объявления.
        </p>
          )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AvatarUpload
          userId={user?.id ?? ''}
          currentPath={avatarPath}
          onUploaded={(path) => {
            setAvatarPath(path)
            setStatus('idle')
          }}
        />

        <label className="block">
          <span className="text-sm font-medium text-foreground">Имя</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border-muted bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {errors.name && (
            <span className="mt-1 block text-sm text-red-700">{errors.name}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Город <span className="text-muted-foreground">(необязательно)</span>
          </span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border-muted bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {errors.city && (
            <span className="mt-1 block text-sm text-red-700">{errors.city}</span>
          )}
        </label>

        {formError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            {formError}
          </p>
        )}
        {status === 'saved' && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Профиль сохранён.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60"
        >
          {status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </section>
  )
}
