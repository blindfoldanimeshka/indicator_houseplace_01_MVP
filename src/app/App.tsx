import { useEffect, useRef, useState, Suspense, lazy } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SearchIcon } from '@/components/icons/search'
import { PlusIcon } from '@/components/icons/plus'
import { HomeIcon } from '@/components/icons/home'
import { MessageSquareIcon } from '@/components/icons/message-square'
import { UserIcon } from '@/components/icons/user'
import type { Database } from '@/types/database'
import { AppShell } from '@/components/layout/AppShell'
import { MenuBar, type MenuBarItem } from '@/components/layout/MenuBar'
import { isSupabaseConfigured } from '@/lib/env'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { useUnreadCounts } from '@/features/chat/useUnreadCounts'
import { NavigationProvider } from '@/app/navigation/NavigationProvider'
import { useNav } from '@/app/navigation/NavigationProvider'
import { CustomCursor } from '@/components/CustomCursor'
import type { NavParams } from '@/app/navigation/types'

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

// Fade in/out page transition — clean, no directional slide
const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
}

const pageTransition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as const, // --ease-smooth
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
  { key: 'home', label: 'Поиск', icon: SearchIcon },
  { key: 'new', label: 'Новое', icon: PlusIcon },
  { key: 'mine', label: 'Мои', icon: HomeIcon },
  { key: 'chats', label: 'Чаты', icon: MessageSquareIcon },
  { key: 'profile', label: 'Профиль', icon: UserIcon },
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
  const { current, push: navPush, back, reset } = useNav()
  const [showNotifications, setShowNotifications] = useState(false)
  const unread = useUnreadCounts()

  // Direction tracking: monotonic depth counter
  const depthRef = useRef(0)
  const prevDepthRef = useRef(0)

  const push = (view: View, params?: NavParams) => {
    prevDepthRef.current = depthRef.current
    depthRef.current++
    navPush(view, params)
  }

  const goBack = () => {
    prevDepthRef.current = depthRef.current
    depthRef.current--
    back()
  }

  useEffect(() => {
    if (!session) reset()
  }, [session, reset])

  function navigate(next: View) {
    if (current.view === next) return
    push(next)
  }

  function openDetail(listing: ListingRow) {
    push('detail', { listingId: listing.id })
  }

  function openChat(chatId: string) {
    unread.markChatRead(chatId)
    setShowNotifications(false)
    push('thread', { chatId })
  }

  function toggleNotifications() {
    setShowNotifications((prev) => !prev)
    if (current.view !== 'chats') push('chats')
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
      {current.view === 'privacy' && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <LegalScreen doc="privacy" onBack={goBack} />
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'terms' && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <LegalScreen doc="terms" onBack={goBack} />
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'new' && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={current.view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <NewListing onSaved={() => navigate('mine')} onCancel={() => navigate('home')} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'mine' && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={current.view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <MyListingsScreen onBack={goBack} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'detail' && current.params.listingId && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={current.view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ListingDetailScreen
                id={current.params.listingId}
                onBack={goBack}
                onStartChat={openChat}
              />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'chats' && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={current.view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ChatsScreen
                onBack={goBack}
                unread={unread}
                onOpenChat={openChat}
                showNotifications={showNotifications}
                onCloseNotifications={() => setShowNotifications(false)}
              />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'thread' && current.params.chatId && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={current.view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ThreadScreen chatId={current.params.chatId} onBack={goBack} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'profile' && (
        <PageTransition key={current.key}>
          <Suspense fallback={SuspenseFallback}>
            <AppShell>
              <MenuNav
                view={current.view}
                onNavigate={navigate}
                unreadTotal={unread.total}
                onToggleNotifications={toggleNotifications}
              />
              <ProfileScreenWrapper onBack={goBack} />
            </AppShell>
          </Suspense>
        </PageTransition>
      )}

      {current.view === 'home' && (
        <PageTransition key={current.key}>
          <AppShell>
            <MenuNav
              view={current.view}
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
      <NavigationProvider>
        <CustomCursor />
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  )
}