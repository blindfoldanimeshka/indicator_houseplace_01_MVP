import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  type Setting,
  type Language,
} from '@/features/profile/types/settings.types'
import { useSettings } from '@/features/profile/useSettings'

type SubTab = 'notifications' | 'privacy' | 'security' | 'preferences'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'notifications', label: 'Уведомления' },
  { id: 'privacy', label: 'Приватность' },
  { id: 'security', label: 'Безопасность' },
  { id: 'preferences', label: 'Предпочтения' },
]

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-pressed={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-stone-300/60'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

const ACCENTS = {
  purple: { label: 'Пурпурный', color: '#7D39EB' },
  lime: { label: 'Лаймовый', color: '#C6FF33' },
  cyan: { label: 'Циан', color: '#22D3EE' },
} as const
const ACCENT_ORDER = ['purple', 'lime', 'cyan'] as const
type AccentKey = (typeof ACCENT_ORDER)[number]

function applyAccent(key: AccentKey) {
  document.documentElement.style.setProperty('--color-primary', ACCENTS[key].color)
  try {
    localStorage.setItem('skvot-accent', key)
  } catch { /* localStorage unavailable */ }
}

function AccentToggler() {
  const [accent, setAccent] = useState<AccentKey>(() => {
    const saved = (() => {
      try {
        return localStorage.getItem('skvot-accent')
      } catch {
        return null
      }
    })()
    return (ACCENT_ORDER as readonly string[]).includes(saved ?? '')
      ? (saved as AccentKey)
      : 'purple'
  })
  useEffect(() => {
    applyAccent(accent)
  }, [accent])
  const next = () => {
    const i = ACCENT_ORDER.indexOf(accent)
    const n = ACCENT_ORDER[(i + 1) % ACCENT_ORDER.length]
    setAccent(n)
  }
  const current = ACCENTS[accent]
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Акцент</p>
        <p className="text-xs text-muted-foreground">{current.label}</p>
      </div>
      <motion.button
        type="button"
        onClick={next}
        aria-label="Сменить акцент"
        className="relative inline-flex h-8 w-14 items-center rounded-full border border-border-muted bg-muted/40 px-0.5"
        whileTap={{ scale: 0.94 }}
      >
        <motion.span
          className="inline-block h-7 w-7 rounded-full shadow"
          style={{ backgroundColor: current.color }}
          animate={{ x: accent === 'purple' ? 0 : accent === 'lime' ? 24 : 48 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </motion.button>
    </div>
  )
}

export function SettingsTab() {
  const { settings, save, saving, error } = useSettings()
  const [active, setActive] = useState<SubTab>('notifications')

  function updateNotifications(
    key: keyof Setting['notifications'],
    value: boolean,
  ) {
    save({ ...settings, notifications: { ...settings.notifications, [key]: value } })
  }

  function updatePrivacy(key: keyof Setting['privacy'], value: boolean) {
    save({ ...settings, privacy: { ...settings.privacy, [key]: value } })
  }

  function updatePreferences<K extends keyof Setting['preferences']>(
    key: K,
    value: Setting['preferences'][K],
  ) {
    save({ ...settings, preferences: { ...settings.preferences, [key]: value } })
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Разделы настроек"
        className="flex flex-wrap gap-2"
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active === tab.id
                ? 'bg-primary text-white shadow-[var(--shadow-glow)]'
                : 'border border-border-muted text-foreground hover:bg-muted/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          Не удалось сохранить настройки: {error}
        </p>
      )}
      {saving && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Сохранение…
        </p>
      )}

      <div className="divide-y divide-border-muted rounded-xl border border-border-muted bg-surface px-4 shadow-[var(--shadow-surface)]">
        {active === 'notifications' && (
          <div>
            <Toggle
              label="Email-уведомления"
              checked={settings.notifications.email}
              onChange={(v) => updateNotifications('email', v)}
            />
            <Toggle
              label="Push-уведомления"
              checked={settings.notifications.push}
              onChange={(v) => updateNotifications('push', v)}
            />
            <Toggle
              label="Уведомления в приложении"
              checked={settings.notifications.inApp}
              onChange={(v) => updateNotifications('inApp', v)}
            />
          </div>
        )}

        {active === 'privacy' && (
          <div>
            <Toggle
              label="Показывать профиль"
              checked={settings.privacy.showProfile}
              onChange={(v) => updatePrivacy('showProfile', v)}
            />
            <Toggle
              label="Показывать email"
              checked={settings.privacy.showEmail}
              onChange={(v) => updatePrivacy('showEmail', v)}
            />
          </div>
        )}

        {active === 'security' && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Смена пароля производится через сервис авторизации. Эта функция
              появится в следующих версиях.
            </p>
            <button
              type="button"
              disabled
              className="rounded-xl border border-border-muted px-4 py-2.5 text-sm font-semibold text-stone-400 disabled:cursor-not-allowed"
            >
              Сменить пароль
            </button>
          </div>
        )}

        {active === 'preferences' && (
          <div className="space-y-4 py-4">
            <AccentToggler />

            <label className="block">
              <span className="text-sm font-medium text-foreground">Язык</span>
              <select
                value={settings.preferences.language}
                onChange={(e) =>
                  updatePreferences('language', e.target.value as Language)
                }
                className="mt-1 w-full rounded-xl border border-border-muted bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
