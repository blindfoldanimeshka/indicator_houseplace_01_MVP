import { useState } from 'react'
import { PersonalInfoTab } from './PersonalInfoTab'
import { SettingsTab } from './SettingsTab'
import { ConnectionsTab } from './ConnectionsTab'
import { DangerTab } from './DangerTab'

type TabId = 'personal' | 'settings' | 'connections' | 'danger'

const TABS: { id: TabId; label: string }[] = [
  { id: 'personal', label: 'Личные данные' },
  { id: 'settings', label: 'Аккаунт' },
  { id: 'connections', label: 'Подключения' },
  { id: 'danger', label: 'Действия' },
]

const TAB_CONTENT: Record<TabId, () => JSX.Element> = {
  personal: PersonalInfoTab,
  settings: SettingsTab,
  connections: ConnectionsTab,
  danger: DangerTab,
}

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabId>('personal')
  const ActiveTab = TAB_CONTENT[activeTab]

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          Профиль
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Управляйте личными данными и настройками аккаунта
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="Разделы профиля"
        className="flex flex-wrap gap-1 border-b border-stone-200"
      >
        {TABS.map((tab) => {
          const selected = tab.id === activeTab
          const tabId = `tab-${tab.id}`
          const panelId = `panel-${tab.id}`
          return (
            <button
              key={tab.id}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-3 py-2 text-sm font-medium transition-colors',
                selected
                  ? 'border-b-2 border-teal-800 text-teal-800'
                  : 'text-stone-600 hover:text-stone-800',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        <ActiveTab />
      </div>
    </section>
  )
}
