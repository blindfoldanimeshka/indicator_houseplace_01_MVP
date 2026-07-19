import { useState } from 'react'
import {
  DEFAULT_SETTINGS,
  type Setting,
  type Theme,
  type Language,
} from '@/features/profile/types/settings.types'

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
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-pressed={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-teal-800' : 'bg-stone-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Setting>(DEFAULT_SETTINGS)
  const [active, setActive] = useState<SubTab>('notifications')

  function updateNotifications(
    key: keyof Setting['notifications'],
    value: boolean,
  ) {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  function updatePrivacy(key: keyof Setting['privacy'], value: boolean) {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }))
  }

  function updatePreferences<K extends keyof Setting['preferences']>(
    key: K,
    value: Setting['preferences'][K],
  ) {
    setSettings((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value },
    }))
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
                ? 'bg-teal-800 text-white'
                : 'border border-stone-300 text-stone-800 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-4">
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
            <p className="text-sm text-stone-600">
              Смена пароля производится через сервис авторизации. Эта функция
              появится в следующих версиях.
            </p>
            <button
              type="button"
              disabled
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-400 disabled:cursor-not-allowed"
            >
              Сменить пароль
            </button>
          </div>
        )}

        {active === 'preferences' && (
          <div className="space-y-4 py-4">
            <label className="block">
              <span className="text-sm font-medium text-stone-800">Тема</span>
              <select
                value={settings.preferences.theme}
                onChange={(e) =>
                  updatePreferences('theme', e.target.value as Theme)
                }
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
              >
                <option value="light">Светлая</option>
                <option value="dark">Тёмная</option>
                <option value="system">Системная</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-800">Язык</span>
              <select
                value={settings.preferences.language}
                onChange={(e) =>
                  updatePreferences('language', e.target.value as Language)
                }
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
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
