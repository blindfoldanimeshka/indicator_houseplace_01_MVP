import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-16 flex items-center justify-between">
          <a className="text-lg font-bold tracking-tight text-teal-950" href="/">
            напрямую
          </a>
          <span className="rounded-full bg-teal-950 px-3 py-1 text-xs font-semibold text-white">
            MVP
          </span>
        </header>
        {children}
      </div>
    </main>
  )
}

