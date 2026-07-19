import { PersonalInfoTab } from './PersonalInfoTab'
import { SettingsTab } from './SettingsTab'
import { ConnectionsTab } from './ConnectionsTab'
import { DangerTab } from './DangerTab'
import { PROFILE_TABS } from '../constants/profile.constants'

// Каркас страницы профиля. Полноценные вкладки заполняются в следующих задачах.
export function ProfilePage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          Профиль
        </h1>
      </header>

      <nav className="flex gap-2 border-b border-stone-200">
        <span className="px-3 py-2 text-sm font-medium text-teal-800">
          Личные данные
        </span>
        <span className="px-3 py-2 text-sm font-medium text-stone-600">
          Аккаунт
        </span>
      </nav>

      <div className="space-y-4">
        <PersonalInfoTab />
        <SettingsTab />
        <ConnectionsTab />
        <DangerTab />
      </div>

      {/* PROFILE_TABS зарезервирован для будущей реализации вкладок */}
      <span className="hidden">{PROFILE_TABS.length}</span>
    </section>
  )
}
