import { useEffect, useState, type FormEvent } from 'react'
import { profileSchema } from '@/features/profile/profileSchema'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'
import { useProfile } from '@/features/profile/useProfile'
import { useAuth } from '@/features/auth/useAuth'

export function PersonalInfoTab() {
  const { user } = useAuth()
  const { profile, save } = useProfile()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [formError, setFormError] = useState<string | null>(null)

  // Seed local form state from the loaded profile (and after every reload that
  // follows a save), without clobbering in-progress edits on unrelated renders.
  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setCity(profile.city ?? '')
    setAvatarPath(profile.avatar_path ?? null)
  }, [profile])

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
    const result = await save({
      name: parsed.data.name,
      city: parsed.data.city || '',
      avatarPath,
    })

    if (result.error) {
      setFormError(result.error)
      setStatus('error')
      return
    }

    setStatus('saved')
  }

  return (
    <section className="space-y-4">
      {!user?.email_confirmed_at && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
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
            className="mt-1 w-full rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-secondary/40"
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
            className="mt-1 w-full rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-secondary/40"
          />
          {errors.city && (
            <span className="mt-1 block text-sm text-red-700">{errors.city}</span>
          )}
        </label>

        {formError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950">
            {formError}
          </p>
        )}
        {status === 'saved' && (
          <p className="rounded-xl bg-green/10 px-4 py-3 text-sm text-green-foreground">
            Профиль сохранён.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </section>
  )
}
