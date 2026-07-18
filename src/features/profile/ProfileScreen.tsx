import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { profileSchema, type ProfileInput } from '@/features/profile/profileSchema'

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { user, updateProfile, signOut } = useAuth()
  const [name, setName] = useState(user?.user_metadata?.name ?? '')
  const [city, setCity] = useState(user?.user_metadata?.city ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [signOutError, setSignOutError] = useState<string | null>(null)

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

    const input: ProfileInput = {
      name: parsed.data.name,
      city: parsed.data.city || '',
    }

    setStatus('saving')
    const result = await updateProfile(input)
    setStatus(result.error ? 'error' : 'saved')

    if (result.error) {
      setFormError(result.error)
    }
  }

  async function handleSignOut() {
    setSignOutError(null)
    const result = await signOut()
    if (result.error) {
      setSignOutError(result.error)
    }
  }

  return (
    <section className="max-w-xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-teal-800 hover:underline"
      >
        ← Назад
      </button>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          Профиль
        </h1>
        <p className="mt-1 text-sm text-stone-600">{user?.email}</p>
      </div>

      {!user?.email_confirmed_at && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Подтвердите email, чтобы публиковать объявления.
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="text-sm font-medium text-stone-800">Имя</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
          />
          {errors.name && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.name}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">
            Город <span className="text-stone-400">(необязательно)</span>
          </span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
          />
          {errors.city && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.city}
            </span>
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
          className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60"
        >
          {status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>

      <div className="border-t border-stone-200 pt-6">
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
        >
          Выйти
        </button>
        {signOutError && (
          <p className="mt-2 text-sm text-red-700">{signOutError}</p>
        )}
      </div>
    </section>
  )
}
