import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const onOpen = vi.fn()

async function renderChatList() {
  const { ChatList } = await import('./ChatList')
  return render(<ChatList onOpen={onOpen} />)
}

describe('ChatList', () => {
  beforeEach(() => {
    vi.resetModules()
    onOpen.mockClear()
  })

  it('shows empty state when there are no chats', async () => {
    vi.doMock('./chatApi', () => ({
      listMyChats: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))

    await renderChatList()

    await waitFor(() =>
      expect(screen.getByText('У вас пока нет диалогов.')).toBeInTheDocument(),
    )
  })

  it('renders a chat row and opens it on click', async () => {
    vi.doMock('./chatApi', () => ({
      listMyChats: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'c1',
            listing_id: 'l1',
            created_at: '2026-01-01T00:00:00.000Z',
            listings: { city: 'Москва', type: 'offer' },
          },
        ],
        error: null,
      }),
    }))

    await renderChatList()

    const button = await waitFor(() => screen.getByText('Москва'))
    expect(button).toBeInTheDocument()

    fireEvent.click(button.closest('button') as HTMLButtonElement)

    expect(onOpen).toHaveBeenCalledWith('c1')
  })

  it('shows error state when listMyChats returns an error', async () => {
    vi.doMock('./chatApi', () => ({
      listMyChats: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'boom' },
      }),
    }))

    await renderChatList()

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })
})
