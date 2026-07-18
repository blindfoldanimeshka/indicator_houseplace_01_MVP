import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type { ProfileInput } from '@/features/profile/profileSchema'

export interface AuthResult {
  error: string | null
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  isLoading: boolean
  signUp: (params: {
    email: string
    password: string
    name: string
    city: string
  }) => Promise<AuthResult>
  signIn: (params: { email: string; password: string }) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
  updateProfile: (input: ProfileInput) => Promise<AuthResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ email, password, name, city }) => {
      const { error } = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: { data: { name, city } },
      })

      return { error: error ? error.message : null }
    },
    [],
  )

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ email, password }) => {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      })

      return { error: error ? error.message : null }
    },
    [],
  )

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    const { error } = await getSupabaseClient().auth.signOut()

    return { error: error ? error.message : null }
  }, [])

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (input) => {
      const {
        data: { user: currentUser },
      } = await getSupabaseClient().auth.getUser()

      if (!currentUser) {
        return { error: 'Пользователь не найден.' }
      }

      const { error } = await getSupabaseClient()
        .from('users')
        .update({ name: input.name, city: input.city || null })
        .eq('id', currentUser.id)

      return { error: error ? error.message : null }
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, isLoading, signUp, signIn, signOut, updateProfile }),
    [session, user, isLoading, signUp, signIn, signOut, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
