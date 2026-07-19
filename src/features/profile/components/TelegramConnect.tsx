import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { getTelegramBotUsername } from '@/lib/env'

// Данные, которые возвращает Telegram Login Widget.
interface TelegramAuthData {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void
    TelegramLoginWidget?: {
      dataOnauth?: (user: TelegramAuthData) => void
    }
  }
}

export function TelegramConnect({
  onConnected,
  onError,
}: {
  onConnected?: () => void
  onError?: (message: string) => void
}) {
  const botUsername = getTelegramBotUsername()
  const containerRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!botUsername || !containerRef.current) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.dataset.telegramLogin = botUsername
    script.dataset.size = 'large'
    script.dataset.requestAccess = 'write'
    script.dataset.userpic = 'false'
    script.dataset.onauth = 'onTelegramAuth'

    window.onTelegramAuth = async (user: TelegramAuthData) => {
      setSubmitting(true)
      try {
        const supabase = getSupabaseClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          onError?.('Необходимо войти в аккаунт.')
          return
        }

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-telegram`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(user),
          },
        )
        const result = await res.json()
        if (!res.ok || !result.ok) {
          onError?.(result.error ?? 'Не удалось подключить Telegram.')
          return
        }
        onConnected?.()
      } catch {
        onError?.('Сетевая ошибка при подключении Telegram.')
      } finally {
        setSubmitting(false)
      }
    }

    containerRef.current.appendChild(script)
    return () => {
      window.onTelegramAuth = undefined
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [botUsername, onConnected, onError])

  if (!botUsername) {
    return (
      <p className="text-sm text-stone-500">
        Для подключения Telegram задайте VITE_TELEGRAM_BOT_USERNAME.
      </p>
    )
  }

  return <div ref={containerRef} aria-busy={submitting} />
}
