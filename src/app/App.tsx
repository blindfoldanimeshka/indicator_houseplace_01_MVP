import { useState } from 'react'
import type { Database } from '@/types/database'
import { AppShell } from '@/components/layout/AppShell'
import { EnvironmentNotice } from '@/components/system/EnvironmentNotice'
import { isSupabaseConfigured } from '@/lib/env'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { Feed } from '@/features/listings/Feed'
import { ListingForm } from '@/features/listings/ListingForm'
import { MyListings } from '@/features/listings/MyListings'
import { ListingDetail } from '@/features/listings/ListingDetail'

type ListingRow = Database['public']['Tables']['listings']['Row']

type View = 'home' | 'new' | 'mine' | 'detail' | 'profile'

function NavBar({
  view,
  onNavigate,
}: {
  view: View
  onNavigate: (view: View) => void
}) {
  const items: { view: View; label: string }[] = [
    { view: 'home', label: 'Поиск' },
    { view: 'new', label: '+ Новое' },
    { view: 'mine', label: 'Мои' },
    { view: 'profile', label: 'Профиль' },
  ]

  return (
    <nav className="mb-10 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.view === view
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-teal-800 text-white'
                : 'border border-stone-300 text-stone-800 hover:bg-stone-100'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

function AppContent() {
  const { session, user, isLoading } = useAuth()
  const [view, setView] = useState<View>('home')
  const [selected, setSelected] = useState<ListingRow | null>(null)

  function navigate(next: View) {
    setSelected(null)
    setView(next)
  }

  function openDetail(listing: ListingRow) {
    setSelected(listing)
    setView('detail')
  }

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-stone-600">Загрузка…</p>
      </AppShell>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  if (view === 'new') {
    return (
      <AppShell>
        <NavBar view={view} onNavigate={navigate} />
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
        <NavBar view={view} onNavigate={navigate} />
        <MyListings onBack={() => navigate('home')} />
      </AppShell>
    )
  }

  if (view === 'detail' && selected) {
    return (
      <AppShell>
        <NavBar view={view} onNavigate={navigate} />
        <ListingDetail id={selected.id} onBack={() => navigate('home')} />
      </AppShell>
    )
  }

  if (view === 'profile') {
    return (
      <AppShell>
        <NavBar view={view} onNavigate={navigate} />
        <ProfileScreen onBack={() => navigate('home')} />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <NavBar view={view} onNavigate={navigate} />
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
