import { type ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PersonalInfoTab } from './PersonalInfoTab'
import { SettingsTab } from './SettingsTab'
import { ConnectionsTab } from './ConnectionsTab'
import { DangerTab } from './DangerTab'
import { OrganizationsTab } from './OrganizationsTab'
import { useNavEntryState } from '@/app/navigation/useNavEntryState'

type TabId =
  | 'personal'
  | 'settings'
  | 'connections'
  | 'organizations'
  | 'danger'

const TABS: { id: TabId; label: string }[] = [
  { id: 'personal', label: 'Личные данные' },
  { id: 'settings', label: 'Аккаунт' },
  { id: 'connections', label: 'Подключения' },
  { id: 'organizations', label: 'Организации' },
  { id: 'danger', label: 'Действия' },
]

const TAB_CONTENT: Record<TabId, () => ReactElement> = {
  personal: PersonalInfoTab,
  settings: SettingsTab,
  connections: ConnectionsTab,
  organizations: OrganizationsTab,
  danger: DangerTab,
}

export function ProfilePage() {
  const [activeTab, setActiveTab] = useNavEntryState<TabId>('profileTab', 'personal')
  const ActiveTab = TAB_CONTENT[activeTab]

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Профиль
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управляйте личными данными и настройками аккаунта
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="Разделы профиля"
        className="flex flex-wrap gap-1"
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
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      <AnimatePresence initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          <ActiveTab />
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
