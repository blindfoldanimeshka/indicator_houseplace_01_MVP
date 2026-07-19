import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { useUnreadCounts } from '@/features/chat/useUnreadCounts'
import { NotificationPanel } from '@/features/chat/NotificationPanel'
import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy'
import { TermsOfService } from '@/features/legal/TermsOfService'

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
        <p className="text-muted-foreground">Загрузка…</p>
      </AppShell>
    )
  }

  if (!session) {
    return <AuthScreen onOpenLegal={(legalView) => navigate(legalView)} />
  }

  return (
    <AnimatePresence mode="wait">
      {view === 'privacy' && (
        <PageTransition key="privacy">
          <PrivacyPolicy onBack={() => navigate('home')} />
        </PageTransition>
      )}

      {view === 'terms' && (
        <PageTransition key="terms">
          <TermsOfService onBack={() => navigate('home')} />
        </PageTransition>
      )}

      {view === 'new' && (
        <PageTransition key="new">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <ListingForm
              onSaved={() => navigate('mine')}
              onCancel={() => navigate('home')}
            />
          </AppShell>
        </PageTransition>
      )}

      {view === 'mine' && (
        <PageTransition key="mine">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <MyListings onBack={() => navigate('home')} />
          </AppShell>
        </PageTransition>
      )}

      {view === 'detail' && selected && (
        <PageTransition key="detail">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <ListingDetail
              id={selected.id}
              onBack={() => navigate('home')}
              onStartChat={openChat}
            />
          </AppShell>
        </PageTransition>
      )}

      {view === 'chats' && (
        <PageTransition key="chats">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <section className="space-y-5">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="text-sm font-medium text-primary hover:underline"
              >
                ← Назад
              </button>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Мои чаты
              </h1>
              <ChatList
                onOpen={openChat}
                unread={unread}
                onChatsResolved={unread.setMyChats}
              />
            </section>
            {showNotifications && (
              <NotificationPanel
                notifications={unread.recent}
                onOpenChat={openChat}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </AppShell>
        </PageTransition>
      )}

      {view === 'thread' && selectedChatId && (
        <PageTransition key="thread">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <button
              type="button"
              onClick={() => navigate('chats')}
              className="mb-5 text-sm font-medium text-primary hover:underline"
            >
              ← Назад
            </button>
            <Thread chatId={selectedChatId} />
          </AppShell>
        </PageTransition>
      )}

      {view === 'profile' && (
        <PageTransition key="profile">
          <AppShell>
            <MenuNav
              view={view}
              onNavigate={navigate}
              unreadTotal={unread.total}
              onToggleNotifications={toggleNotifications}
            />
            <ProfilePage />
          </AppShell>
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
            <Feed onOpen={openDetail} />
            {!user?.email_confirmed_at && (
              <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Подтвердите email, чтобы публиковать объявления.
              </p>
            )}
            <EnvironmentNotice configured={isSupabaseConfigured()} />
            {showNotifications && (
              <NotificationPanel
                notifications={unread.recent}
                onOpenChat={openChat}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </AppShell>
        </PageTransition>
      )}
    </AnimatePresence>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
