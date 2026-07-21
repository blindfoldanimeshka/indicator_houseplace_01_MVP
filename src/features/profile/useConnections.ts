import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'

export type ConnectionProvider =
  | 'google'
  | 'apple'
  | 'yandex'
  | 'vk'
  | 'telegram'

export interface ConnectionStatus {
  id: ConnectionProvider
  name: string
  connected: boolean
}

export const CONNECTION_PROVIDERS: { id: ConnectionProvider; name: string; native: boolean }[] =
  [
    { id: 'google', name: 'Google Account', native: true },
    { id: 'apple', name: 'Apple ID', native: true },
    { id: 'yandex', name: 'Яндекс', native: true },
    { id: 'vk', name: 'VK', native: true },
    { id: 'telegram', name: 'Telegram', native: false },
  ]

export interface UseConnectionsResult {
  connections: ConnectionStatus[]
  loading: boolean
  connecting: ConnectionProvider | null
  error: string | null
  refresh: () => Promise<void>
  link: (provider: ConnectionProvider) => Promise<void>
  unlink: (provider: ConnectionProvider) => Promise<void>
}

function nativeName(provider: ConnectionProvider): string {
  return CONNECTION_PROVIDERS.find((p) => p.id === provider)?.name ?? provider
}

export function useConnections() {
  const { user } = useAuth()
  const [connections, setConnections] = useState<ConnectionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<ConnectionProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeRef = useRef(true)

  const mapConnections = useCallback(
    (linkedNative: Set<string>, telegramConnected: boolean): ConnectionStatus[] =>
      CONNECTION_PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.native
          ? linkedNative.has(p.id)
          : p.id === 'telegram' && telegramConnected,
      })),
    [],
  )

  const refresh = useCallback(async () => {
    setError(null)
    if (!user) {
      setConnections([])
      setLoading(false)
      return
    }

    // getSupabaseClient() throws (env validation) when config is missing,
    // or the request fails in a non-interactive context (e.g. tests).
    // Surface a graceful fallback list instead of crashing the tab render.
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getUser()
      const identities = data.user?.identities ?? []
      const linkedNative = new Set(identities.map((i) => i.provider))

      const { data: profile } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('id', user.id)
        .maybeSingle()

      const telegramConnected = Boolean(profile?.telegram_id)

      if (!activeRef.current) return
      setConnections(mapConnections(linkedNative, telegramConnected))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки подключений')
      // Render the provider list with nothing connected rather than crashing.
      setConnections(mapConnections(new Set(), false))
    } finally {
      if (activeRef.current) setLoading(false)
    }
  }, [user, mapConnections])

  useEffect(() => {
    void refresh()
    return () => {
      activeRef.current = false
    }
  }, [refresh])

  const link = useCallback(
    async (provider: ConnectionProvider) => {
      if (provider === 'telegram') {
        // Telegram handled by widget component (see TelegramConnect).
        setError(null)
        return
      }
      setConnecting(provider)
      setError(null)
      try {
        const supabase = getSupabaseClient()
        const { error: linkError } = await supabase.auth.linkIdentity({
          provider: provider as never,
          options: {
            redirectTo: `${window.location.origin}/`,
          },
        })
        if (linkError) {
          setError(linkError.message)
          setConnecting(null)
        }
        // On success the page redirects; on return refresh() repopulates.
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка привязки')
        setConnecting(null)
      }
    },
    [],
  )

  const unlink = useCallback(
    async (provider: ConnectionProvider) => {
      setError(null)
      try {
        const supabase = getSupabaseClient()

        if (provider === 'telegram') {
          const { error: updateError } = await supabase
            .from('users')
            .update({ telegram_id: null })
            .eq('id', user!.id)
          if (updateError) setError(updateError.message)
          else await refresh()
          return
        }

        const { data } = await supabase.auth.getUser()
        const identity = (data.user?.identities ?? []).find(
          (i) => i.provider === provider,
        )
        if (!identity) {
          setError('Привязка не найдена')
          return
        }
        const { error: unlinkError } = await supabase.auth.unlinkIdentity(
          identity as never,
        )
        if (unlinkError) {
          setError(unlinkError.message)
        } else {
          await refresh()
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка отвязки')
      }
    },
    [user, refresh],
  )

  return {
    connections,
    loading,
    connecting,
    error,
    refresh,
    link,
    unlink,
  }
}

export { nativeName }
