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
    const supabase = getSupabaseClient()

    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError.message)
        } else if (data) {
          setSettings(rowToSettings(data as SettingsRow))
        }
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

      const supabase = getSupabaseClient()
      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert(settingsToRow(next, user.id))

      if (upsertError) {
        setError(upsertError.message)
      }
      setSaving(false)
    },
    [user],
  )

  return { settings, save, loading, saving, error }
}
