export type Theme = 'light' | 'dark' | 'system'
export type Language = 'ru' | 'en'

export interface NotificationsSettings {
  email: boolean
  push: boolean
  inApp: boolean
}

export interface PrivacySettings {
  showProfile: boolean
  showEmail: boolean
}

export interface PreferencesSettings {
  theme: Theme
  language: Language
}

export interface Setting {
  notifications: NotificationsSettings
  privacy: PrivacySettings
  preferences: PreferencesSettings
}

export const DEFAULT_SETTINGS: Setting = {
  notifications: { email: true, push: true, inApp: true },
  privacy: { showProfile: true, showEmail: false },
  preferences: { theme: 'system', language: 'ru' },
}
