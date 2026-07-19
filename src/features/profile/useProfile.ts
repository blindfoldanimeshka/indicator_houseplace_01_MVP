import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'

export interface ProfileData {
  name: string
  city: string | null
  avatar_path: string | null
}

export interface UseProfileResult {
  profile: ProfileData | null
  loading: boolean
  save: (input: { name: string; city: string; avatarPath?: string | null }) => Promise<{ error: string | null }>
  reload: () => Promise<void>
}

export function useProfile(): UseProfileResult {
  const { user, updateProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)

  // Use a ref to store the latest user to avoid infinite loops
  // when the user object reference changes but the user ID is the same
  const userRef = useRef(user)
  userRef.current = user

  const reload = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser) {
      setProfile(null)
      return
    }
    setLoading(true)
    const { data } = await getSupabaseClient()
      .from('users')
      .select('name, city, avatar_path')
      .eq('id', currentUser.id)
      .maybeSingle()
    if (data) {
      setProfile({
        name: data.name ?? '',
        city: data.city ?? null,
        avatar_path: data.avatar_path ?? null,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback<UseProfileResult['save']>(
    async (input) => {
      const result = await updateProfile(input)
      if (!result.error) {
        await reload()
      }
      return result
    },
    [updateProfile, reload],
  )

  return { profile, loading, save, reload }
}
