import { useState } from 'react'
import { Search, Plus, Home, MessageSquare, User } from 'lucide-react'
import type { Database } from '@/types/database'
import { AppShell } from '@/components/layout/AppShell'
import { EnvironmentNotice } from '@/components/system/EnvironmentNotice'
import { MenuBar, type MenuBarItem } from '@/components/layout/MenuBar'
import { isSupabaseConfigured } from '@/lib/env'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ProfilePage } from '@/features/profile/components/ProfilePage'
import { Feed } from '@/features/listings/Feed'
import { ListingForm } from '@/features/listings/ListingForm'
import { MyListings } from '@/features/listings/MyListings'
import { ListingDetail } from '@/features/listings/ListingDetail'
import { ChatList } from '@/features/chat/ChatList'
import { Thread } from '@/features/chat/Thread'
import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy'
import { TermsOfService } from '@/features/legal/TermsOfService'

type ListingRow = Database['public']['Tables']['listings']['Row']

type View =
  | 'home'
  | 'new'
  | 'mine'
  | 'detail'
  | 'profile'
  | 'chats'
  | 'thread'
  | 'privacy'
  | 'terms'

const NAV_ITEMS: MenuBarItem[] = [
  { key: 'home', label: 'Поиск', icon: Search },
  { key: 'new', label: 'Новое', icon: Plus },
  { key: 'mine', label: 'Мои', icon: Home },
  { key: 'chats', label: 'Чаты', icon: MessageSquare },
  { key: 'profile', label: 'Профиль', icon: User },
]

function MenuNav({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  const topLevel: Record<string, View> = {
    home: 'home',
    new: 'new',
    mine: 'mine',
    chats: 'chats',
    profile: 'profile',
  }
  const items: MenuBarItem[] = NAV_ITEMS.map((item) => ({
    ...item,
    active: topLevel[item.key] === view,
  }))

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <MenuBar items={items} onSelect={(key) => onNavigate(topLevel[key])} />
    </div>
  )
}

function AppContent() {
  const { session, user, isLoading } = useAuth()
  const [view, setView] = useState<View>('home')
  const [selected, setSelected] = useState<ListingRow | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  function navigate(next: View) {
    setSelected(null)
    setView(next)
  }

  function openDetail(listing: ListingRow) {
    setSelected(listing)
    setView('detail')
  }

  function openChat(chatId: string) {
    setSelectedChatId(chatId)
    setView('thread')
  }

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-stone-600">Загрузка…</p>
      </AppShell>
    )
  }

  if (!session) {
    return <AuthScreen onOpenLegal={(legalView) => navigate(legalView)} />
  }

  if (view === 'privacy') {
    return <PrivacyPolicy onBack={() => navigate('home')} />
  }

  if (view === 'terms') {
    return <TermsOfService onBack={() => navigate('home')} />
  }

  if (view === 'new') {
    return (
      <AppShell>
        <MenuNav view={view} onNavigate={navigate} />
        <ListingForm
          onSaved={() => navigate('mine')}
          onCancel={() => navigate('home')}
        />
      </AppShell>
    )
  }

  if (view === 'mine') {
    return (
      <AppShell>
        <MenuNav view={view} onNavigate={navigate} />
        <MyListings onBack={() => navigate('home')} />
      </AppShell>
    )
  }

  if (view === 'detail' && selected) {
    return (
      <AppShell>
        <MenuNav view={view} onNavigate={navigate} />
        <ListingDetail
          id={selected.id}
          onBack={() => navigate('home')}
          onStartChat={openChat}
        />
      </AppShell>
    )
  }

  if (view === 'chats') {
    return (
      <AppShell>
        <MenuNav view={view} onNavigate={navigate} />
        <section className="space-y-5">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-sm font-medium text-teal-800 hover:underline"
          >
            ← Назад
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            Мои чаты
          </h1>
          <ChatList onOpen={openChat} />
        </section>
      </AppShell>
    )
  }

  if (view === 'thread' && selectedChatId) {
    return (
      <AppShell>
        <MenuNav view={view} onNavigate={navigate} />
        <button
          type="button"
          onClick={() => navigate('chats')}
          className="mb-5 text-sm font-medium text-teal-800 hover:underline"
        >
          ← Назад
        </button>
        <Thread chatId={selectedChatId} />
      </AppShell>
    )
  }

  if (view === 'profile') {
    return (
      <AppShell>
        <MenuNav view={view} onNavigate={navigate} />
        <ProfilePage />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <MenuNav view={view} onNavigate={navigate} />
      <Feed onOpen={openDetail} />
      {!user?.email_confirmed_at && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Подтвердите email, чтобы публиковать объявления.
        </p>
      )}
      <EnvironmentNotice configured={isSupabaseConfigured()} />
    </AppShell>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
