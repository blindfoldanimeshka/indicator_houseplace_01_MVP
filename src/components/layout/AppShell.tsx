import type { ReactNode } from 'react'
import { useScroll, useSpring, useReducedMotion, useTransform, motion } from 'motion/react'
import logoSvg from '@/public/СКВОТ.svg'
import { NotificationBell } from '@/features/notifications/NotificationBell'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { scrollYProgress } = useScroll()
  const prefersReduced = useReducedMotion()
  const smoothX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })
  const scaleX = prefersReduced ? scrollYProgress : smoothX

  const topFade = useTransform(scrollYProgress, [0, 0.04], [0, 0.9])
  const bottomFade = useTransform(scrollYProgress, [0.96, 1], [0, 0.9])
  const topOpacity = prefersReduced ? undefined : topFade
  const bottomOpacity = prefersReduced ? undefined : bottomFade

  return (
    <main className="min-h-screen bg-stone-50 pb-28">
      <header className="sticky top-0 z-40 bg-surface/80 shadow-[var(--shadow-surface)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <a href="/" aria-label="СКВОТ">
            <img
              src={logoSvg}
              alt="СКВОТ"
              className="h-9 w-auto"
            />
          </a>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="rounded-full border border-secondary/30 bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
              MVP
            </span>
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-50 h-0.5 origin-left bg-primary"
          style={{ scaleX }}
        />
      </header>
      <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 sm:pt-8">
        {children}
      </div>
      {/* top edge fade */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-black/70 to-transparent"
        style={prefersReduced ? undefined : { opacity: topOpacity }}
      />
      {/* bottom edge fade */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-black/70 to-transparent"
        style={prefersReduced ? undefined : { opacity: bottomOpacity }}
      />
    </main>
  )
}

