import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { EnvironmentNotice } from '@/components/system/EnvironmentNotice'
import { isSupabaseConfigured } from '@/lib/env'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'

type View = 'home' | 'profile'

function AppContent() {
  const { session, isLoading } = useAuth()
  const [view, setView] = useState<View>('home')

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

  if (view === 'profile') {
    return (
      <AppShell>
        <ProfileScreen onBack={() => setView('home')} />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <section className="max-w-2xl space-y-5">
        <p className="text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">
          Ранняя альфа
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Аренда жилья напрямую.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-stone-600">
          Фундамент проекта готов. Следующий вертикальный срез — безопасные
          объявления, доступные только через политики Supabase.
        </p>
        <EnvironmentNotice configured={isSupabaseConfigured()} />
        <button
          type="button"
          onClick={() => setView('profile')}
          className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900"
        >
          Мой профиль
        </button>
      </section>
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
