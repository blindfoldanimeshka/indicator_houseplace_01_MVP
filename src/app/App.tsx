import { useEffect, useState, Suspense, lazy } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Plus, Home, MessageSquare, User } from 'lucide-react'
import type { Database } from '@/types/database'
import { AppShell } from '@/components/layout/AppShell'
import { MenuBar, type MenuBarItem } from '@/components/layout/MenuBar'
import { isSupabaseConfigured } from '@/lib/env'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { useUnreadCounts } from '@/features/chat/useUnreadCounts'

// Lazy-loaded heavy screens
const NewListing = lazy(() => import('@/app/screens/NewListing').then((m) => ({ default: m.NewListing })))
const MyListingsScreen = lazy(() => import('@/app/screens/MyListingsScreen').then((m) => ({ default: m.MyListingsScreen })))
const ListingDetailScreen = lazy(() => import('@/app/screens/ListingDetailScreen').then((m) => ({ default: m.ListingDetailScreen })))
const ChatsScreen = lazy(() => import('@/app/screens/ChatsScreen').then((m) => ({ default: m.ChatsScreen })))
const ThreadScreen = lazy(() => import('@/app/screens/ThreadScreen').then((m) => ({ default: m.ThreadScreen })))
const ProfileScreenWrapper = lazy(() => import('@/app/screens/ProfileScreenWrapper').then((m) => ({ default: m.ProfileScreenWrapper })))
const LegalScreen = lazy(() => import('@/app/screens/LegalScreen').then((m) => ({ default: m.LegalScreen })))

// Eager-loaded landing screen
import { HomeFeed } from '@/app/screens/HomeFeed'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

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

function MenuNav({
  view,
  onNavigate,
  unreadTotal,
  onToggleNotifications,
}: {
  view: View
  onNavigate: (view: View) => void
  unreadTotal: number
  onToggleNotifications: () => void
}) {
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
    badge: item.key === 'chats' && unreadTotal > 0 ? unreadTotal : undefined,
  }))

  // Shrink the dock while scrolling down; it restores on scroll up (and on hover
  // inside MenuBar itself).
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const goingDown = y > lastY
        if (goingDown && y > 80) setCompact(true)
        else if (!goingDown) setCompact(false)
        lastY = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <MenuBar
        items={items}
        compact={compact}
        onSelect={(key) => {
          if (key === 'chats') onToggleNotifications()
          else onNavigate(topLevel[key])
        }}
      />
    </div>
  )
}

function AppContent() {
  const { session, user, isLoading } = useAuth()
  const [view, setView] = useState<View>('home')
  const [selected, setSelected] = useState<ListingRow | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const unread = useUnreadCounts()

  function navigate(next: View) {
    setSelected(null)
    setView(next)
  }

  function openDetail(listing: ListingRow) {
    setSelected(listing)
    setView('detail')
  }

  function openChat(chatId: string) {
    unread.markChatRead(chatId)
    setShowNotifications(false)
    setSelectedChatId(chatId)
    setView('thread')
  }

  function toggleNotifications() {
    setShowNotifications((prev) => !prev)
    if (view !== 'chats') setView('chats')
  }

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-muted-foreground animate-pulse">Загрузка…</p>
      </AppShell>
    )
  }

  if (!session) {
    return <AuthScreen onOpenLegal={(legalView) => navigate(legalView)} />
  }

  const SuspenseFallback = (
    <AppShell>
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    </AppShell>
  )

  return (
    <AnimatePresence mode="wait">
      {view === 'privacy' && (
        <PageTransition key="privacy">
          <Suspense fallback={SuspenseFallback}>
            <LegalScreen doc="privacy" onBack={() => navigate('home')} />
          </Suspense>
        </PageTransition>
      )}

      {view === 'terms' && (
        <PageTransition key="terms">
          <Suspense fallback={SuspenseFallback}>
            <LegalScreen doc="terms" onBack={() => navigate('home')} />
          </Suspense>
        </PageTransition>
      )}

      {view === 'new' && (
        <PageTransition key="new">
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <NewListing onSaved={() => navigate('mine')} onCancel={() => navigate('home')} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {view === 'mine' && (
        <PageTransition key="mine">
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <MyListingsScreen onBack={() => navigate('home')} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {view === 'detail' && selected && (
        <PageTransition key="detail">
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ListingDetailScreen
                id={selected.id}
                onBack={() => navigate('home')}
                onStartChat={openChat}
              />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {view === 'chats' && (
        <PageTransition key="chats">
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ChatsScreen
                onBack={() => navigate('home')}
                unread={unread}
                onOpenChat={openChat}
                showNotifications={showNotifications}
                onCloseNotifications={() => setShowNotifications(false)}
              />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {view === 'thread' && selectedChatId && (
        <PageTransition key="thread">
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ThreadScreen chatId={selectedChatId} onBack={() => navigate('chats')} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {view === 'profile' && (
        <PageTransition key="profile">
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ProfileScreenWrapper onBack={() => navigate('home')} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {view === 'home' && (
        <PageTransition key="home">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <HomeFeed
              onOpen={openDetail}
              onCreate={() => navigate('new')}
              userEmailConfirmed={Boolean(user?.email_confirmed_at)}
              isSupabaseConfigured={isSupabaseConfigured()}
              showNotifications={showNotifications}
              unread={unread}
              onOpenChat={openChat}
              onCloseNotifications={() => setShowNotifications(false)}
            />
          </AppShell>
        </PageTransition>
      )}
    </AnimatePresence>
  )
}

function SupabaseNotConfigured() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center bg-background">
      <h1 className="font-display text-lg font-semibold">Supabase не настроен</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Приложение запущено без переменных окружения{' '}
        <code>VITE_SUPABASE_URL</code> и{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. Задайте их в настройках
        окружения и пересоберите проект.
      </p>
    </div>
  )
}

export function App() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfigured />
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}