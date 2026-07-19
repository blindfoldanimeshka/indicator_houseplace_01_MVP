import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationPanel } from '@/features/chat/NotificationPanel'
import type { UnreadNotification } from '@/features/chat/useUnreadCounts'

const notes: UnreadNotification[] = [
  {
    chatId: 'c1',
    messageId: 'm1',
    text: 'Привет, квартира доступна?',
    senderId: 'u2',
    createdAt: new Date().toISOString(),
  },
]

describe('NotificationPanel', () => {
  it('shows an empty state when there are no notifications', () => {
    render(
      <NotificationPanel
        notifications={[]}
        onOpenChat={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/новых уведомлений нет/i)).toBeInTheDocument()
  })

  it('lists notifications and opens the chat on click', () => {
    const onOpenChat = vi.fn()
    render(
      <NotificationPanel
        notifications={notes}
        onOpenChat={onOpenChat}
        onClose={vi.fn()}
      />,
    )

    const button = screen.getByText('Привет, квартира доступна?')
    fireEvent.click(button)
    expect(onOpenChat).toHaveBeenCalledWith('c1')
  })
})
