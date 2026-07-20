import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { NavEntry, NavParams, View } from './types'
import {
  initialStack,
  reduceStack,
  type StackAction,
  type StackState,
} from './stack'

interface NavContextValue {
  current: NavEntry
  canGoBack: boolean
  canGoForward: boolean
  push: (view: View, params?: NavParams) => void
  replace: (view: View, params?: NavParams) => void
  back: () => void
  forward: () => void
  reset: (view?: View) => void
  updateEntry: (key: string, patch: Partial<NavEntry>) => void
}

const NavContext = createContext<NavContextValue | null>(null)

export interface NavigationProviderProps {
  children: ReactNode
  initial?: StackState
}

export function NavigationProvider({
  children,
  initial,
}: NavigationProviderProps) {
  const [state, setState] = useState<StackState>(
    () => initial ?? initialStack('home'),
  )

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  const dispatch = useCallback(
    (action: StackAction) => setState((s) => reduceStack(s, action)),
    [],
  )

  const updateEntry = useCallback(
    (key: string, patch: Partial<NavEntry>) => {
      setState((s) => {
        const idx = s.entries.findIndex((e) => e.key === key)
        if (idx === -1) return s
        const entries = s.entries.slice()
        entries[idx] = { ...entries[idx], ...patch }
        return { ...s, entries }
      })
    },
    [],
  )

  const value = useMemo<NavContextValue>(
    () => ({
      current: state.entries[state.index],
      canGoBack: state.index > 0,
      canGoForward: state.index < state.entries.length - 1,
      push: (view, params) => dispatch({ type: 'push', view, params }),
      replace: (view, params) => dispatch({ type: 'replace', view, params }),
      back: () => dispatch({ type: 'back' }),
      forward: () => dispatch({ type: 'forward' }),
      reset: (view) => dispatch({ type: 'reset', view }),
      updateEntry,
    }),
    [state, dispatch, updateEntry],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavigationProvider')
  return ctx
}
