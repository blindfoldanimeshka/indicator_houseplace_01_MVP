import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { useAuth } from '@/features/auth/useAuth'
import { authSchema } from '@/features/profile/profileSchema'
import { validateInviteCode, isInviteCodeFormatValid } from '@/features/auth/invite'

type Mode = 'signIn' | 'signUp' | 'reset'

const signInOnlySchema = z.object({
  email: authSchema.shape.email,
  password: authSchema.shape.password,
})

const resetSchema = z.object({
  email: authSchema.shape.email,
})

interface AuthScreenProps {
  onOpenLegal: (view: 'privacy' | 'terms') => void
}

export function AuthScreen({ onOpenLegal }: AuthScreenProps) {
  const { signUp, signIn, resetPassword, user } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [consent, setConsent] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignUp = mode === 'signUp'
  const isReset = mode === 'reset'

  function switchMode(next: Mode) {
    setMode(next)
    setErrors({})
    setFormError(null)
    setSuccessMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setErrors({})
    setSuccessMessage(null)

    if (isReset) {
      const parsed = resetSchema.safeParse({ email })
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
      const result = await resetPassword(parsed.data.email)
      setIsSubmitting(false)

      if (result.error) {
        setFormError(result.error)
      } else {
        setSuccessMessage('Письмо отправлено, проверьте почту')
        setEmail('')
      }
      return
    }

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

      if (!isInviteCodeFormatValid(inviteCode)) {
        setIsSubmitting(false)
        setFormError('Введите инвайт-код в формате BETA-XXXXXX')
        return
      }

      const inviteValid = await validateInviteCode(inviteCode)
      if (!inviteValid) {
        setIsSubmitting(false)
        setFormError('Недействительный инвайт-код')
        return
      }

      result = await signUp({
        email: data.email,
        password: data.password,
        name: data.name,
        city: data.city ?? '',
        inviteCode: inviteCode.trim().toUpperCase(),
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
          {isReset ? 'Сброс пароля' : isSignUp ? 'Регистрация' : 'Вход'}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Аренда жилья напрямую, без посредников.
        </p>

        {isUnconfirmed && (
          <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p>
              Письмо отправлено на {user?.email}. Проверьте папку «Спам».
              Не пришло?
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!user?.email) return
                setIsSubmitting(true)
                const res = await resetPassword(user.email)
                setIsSubmitting(false)
                if (res.error) {
                  setFormError(res.error)
                } else {
                  setSuccessMessage('Письмо повторно отправлено')
                }
              }}
              disabled={isSubmitting}
              className="font-medium text-teal-800 hover:underline disabled:opacity-60"
            >
              Отправить повторно
            </button>
          </div>
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

          {isSignUp && (
            <Field
              label="Инвайт-код"
              type="text"
              value={inviteCode}
              onChange={setInviteCode}
              error={errors.inviteCode}
              autoComplete="off"
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

          {!isReset && (
            <Field
              label="Пароль"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          )}

          {isSignUp && (
            <label className="flex items-start gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-teal-800 focus:ring-teal-200"
              />
              <span>
                Я согласен на обработку персональных данных согласно{' '}
                <a
                  href="#"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault()
                    onOpenLegal('privacy')
                  }}
                  className="font-medium text-teal-800 hover:underline"
                >
                  Политике конфиденциальности
                </a>{' '}
                и{' '}
                <a
                  href="#"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault()
                    onOpenLegal('terms')
                  }}
                  className="font-medium text-teal-800 hover:underline"
                >
                  Условиям
                </a>
                .
              </span>
            </label>
          )}

          {formError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
              {formError}
            </p>
          )}

          {successMessage && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (isSignUp && !consent)}
            className="w-full rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60"
          >
            {isSubmitting
              ? 'Подождите…'
              : isReset
                ? 'Отправить ссылку'
                : isSignUp
                  ? 'Зарегистрироваться'
                  : 'Войти'}
          </button>
        </form>

        {!isReset && (
          <button
            type="button"
            onClick={() => switchMode('reset')}
            className="mt-4 w-full text-center text-sm font-medium text-teal-800 hover:underline"
          >
            Забыли пароль?
          </button>
        )}

        {isReset ? (
          <button
            type="button"
            onClick={() => switchMode('signIn')}
            className="mt-4 w-full text-center text-sm font-medium text-teal-800 hover:underline"
          >
            Вернуться ко входу
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
            className="mt-4 w-full text-center text-sm font-medium text-teal-800 hover:underline"
          >
            {isSignUp
              ? 'Уже есть аккаунт? Войти'
              : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        )}

        <footer className="mt-6 flex justify-center gap-4 border-t border-stone-200 pt-4 text-xs text-stone-500">
          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            className="hover:text-teal-800 hover:underline"
          >
            Политика конфиденциальности
          </button>
          <button
            type="button"
            onClick={() => onOpenLegal('terms')}
            className="hover:text-teal-800 hover:underline"
          >
            Условия
          </button>
        </footer>
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
