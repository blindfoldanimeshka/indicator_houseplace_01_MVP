import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import {
  DEFAULT_SETTINGS,
  type Setting,
} from '@/features/profile/types/settings.types'

type SettingsRow = {
  email_notif: boolean
  push_notif: boolean
  inapp_notif: boolean
  show_profile: boolean
  show_email: boolean
  theme: Setting['preferences']['theme']
  language: Setting['preferences']['language']
}

function rowToSettings(row: SettingsRow): Setting {
  return {
    notifications: {
      email: row.email_notif,
      push: row.push_notif,
      inApp: row.inapp_notif,
    },
    privacy: {
      showProfile: row.show_profile,
      showEmail: row.show_email,
    },
    preferences: {
      theme: row.theme,
      language: row.language,
      accent: 'purple',
    },
  }
}

function settingsToRow(
  settings: Setting,
  userId: string,
): SettingsRow & { user_id: string } {
  return {
    user_id: userId,
    email_notif: settings.notifications.email,
    push_notif: settings.notifications.push,
    inapp_notif: settings.notifications.inApp,
    show_profile: settings.privacy.showProfile,
    show_email: settings.privacy.showEmail,
    theme: settings.preferences.theme,
    language: settings.preferences.language,
  }
}

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Setting>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    // getSupabaseClient() throws (env validation) when config is missing
    // or the request fails in a non-interactive context (e.g. tests).
    // We must NOT let that crash the whole ProfilePage render — fall back
    // to DEFAULT_SETTINGS and surface a recoverable error instead.
    Promise.resolve()
      .then(() => getSupabaseClient())
      .then((supabase) =>
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      )
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError.message)
        } else if (data) {
          setSettings(rowToSettings(data as SettingsRow))
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Ошибка загрузки настроек')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  const save = useCallback(
    async (next: Setting) => {
      if (!user) return
      setSettings(next)
      setSaving(true)
      setError(null)

      try {
        const supabase = getSupabaseClient()
        const { error: upsertError } = await supabase
          .from('user_settings')
          .upsert(settingsToRow(next, user.id))

        if (upsertError) {
          setError(upsertError.message)
        } else {
          // Mirror notification channels into notification_prefs so the
          // notify Edge Function reads the user's actual preferences.
          const { error: prefsError } = await supabase
            .from('notification_prefs')
            .upsert({
              user_id: user.id,
              email_notif: next.notifications.email,
              push_notif: next.notifications.push,
              inapp_notif: next.notifications.inApp,
              show_profile: next.privacy.showProfile,
              show_email: next.privacy.showEmail,
            })
          if (prefsError) {
            setError(prefsError.message)
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка сохранения настроек')
      } finally {
        setSaving(false)
      }
    },
    [user],
  )

  return { settings, save, loading, saving, error }
}
