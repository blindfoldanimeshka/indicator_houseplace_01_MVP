import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { useAuth } from '@/features/auth/useAuth'
import { authSchema } from '@/features/profile/profileSchema'

type Mode = 'signIn' | 'signUp'

const signInOnlySchema = z.object({
  email: authSchema.shape.email,
  password: authSchema.shape.password,
})

export function AuthScreen() {
  const { signUp, signIn, user } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignUp = mode === 'signUp'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setErrors({})

    const payload = { email, password, name, city }
    const schema = isSignUp ? authSchema : signInOnlySchema
    const parsed = schema.safeParse(payload)

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

    setIsSubmitting(true)
    let result
    if (isSignUp) {
      const data = parsed.data as z.infer<typeof authSchema>
      result = await signUp({
        email: data.email,
        password: data.password,
        name: data.name,
        city: data.city ?? '',
      })
    } else {
      const data = parsed.data as z.infer<typeof signInOnlySchema>
      result = await signIn({ email: data.email, password: data.password })
    }
    setIsSubmitting(false)

    if (result.error) {
      setFormError(result.error)
    }
  }

  const isUnconfirmed = Boolean(user) && !user?.email_confirmed_at

  return (
    <AuthLayout>
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          {isSignUp ? 'Регистрация' : 'Вход'}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Аренда жилья напрямую, без посредников.
        </p>

        {isUnconfirmed && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Подтвердите email, чтобы публиковать объявления.
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {isSignUp && (
            <Field
              label="Имя"
              type="text"
              value={name}
              onChange={setName}
              error={errors.name}
              autoComplete="name"
            />
          )}
          {isSignUp && (
            <Field
              label="Город"
              type="text"
              value={city}
              onChange={setCity}
              error={errors.city}
              autoComplete="address-level2"
              optional
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            autoComplete="email"
          />
          <Field
            label="Пароль"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          {formError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60"
          >
            {isSubmitting
              ? 'Подождите…'
              : isSignUp
                ? 'Зарегистрироваться'
                : 'Войти'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isSignUp ? 'signIn' : 'signUp')
            setErrors({})
            setFormError(null)
          }}
          className="mt-4 w-full text-center text-sm font-medium text-teal-800 hover:underline"
        >
          {isSignUp
            ? 'Уже есть аккаунт? Войти'
            : 'Нет аккаунта? Зарегистрироваться'}
        </button>
      </div>
    </AuthLayout>
  )
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-12">
      {children}
    </main>
  )
}

interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete: string
  optional?: boolean
}

function Field({
  label,
  type,
  value,
  onChange,
  error,
  autoComplete,
  optional,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-800">
        {label}
        {optional && <span className="text-stone-400"> (необязательно)</span>}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
      />
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  )
}
