import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface ChatApiMock {
  listMessages: ReturnType<typeof vi.fn>
  sendMessage: ReturnType<typeof vi.fn>
  subscribeMessages: ReturnType<typeof vi.fn>
}

function mockChatApi(impl: Partial<ChatApiMock> = {}) {
  const api: ChatApiMock = {
    listMessages: vi.fn().mockResolvedValue({ data: [], error: null }),
    sendMessage: vi.fn().mockResolvedValue({ data: {}, error: null }),
    subscribeMessages: vi.fn(() => () => undefined),
    ...impl,
  }
  vi.doMock('@/features/chat/chatApi', () => ({
    listMessages: api.listMessages,
    sendMessage: api.sendMessage,
    subscribeMessages: api.subscribeMessages,
    openOrCreateChat: vi.fn(),
  }))
  return api
}

async function renderThread() {
  const { Thread } = await import('./Thread')
  return render(<Thread chatId="c1" />)
}

describe('Thread', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/features/auth/useAuth', () => ({
      useAuth: () => ({ user: { id: 'me' } }),
    }))
  })

  it('renders both messages', async () => {
    mockChatApi({
      listMessages: vi
        .fn()
        .mockResolvedValue({
          data: [
            { id: 'm1', chat_id: 'c1', sender_id: 'me', text: 'hi', created_at: 't' },
            {
              id: 'm2',
              chat_id: 'c1',
              sender_id: 'other',
              text: 'hello',
              created_at: 't2',
            },
          ],
          error: null,
        }),
    })

    await renderThread()

    await waitFor(() => expect(screen.getByText('hi')).toBeInTheDocument())
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('disables send with empty text and sends on submit', async () => {
    const api = mockChatApi({
      listMessages: vi
        .fn()
        .mockResolvedValue({ data: [], error: null }),
    })

    await renderThread()

    const sendButton = await waitFor(() =>
      screen.getByRole('button', { name: 'Отправить' }),
    )

    expect(sendButton).toBeDisabled()

    const textarea = screen.getByPlaceholderText('Ваше сообщение…')
    fireEvent.change(textarea, { target: { value: 'привет' } })

    expect(sendButton).not.toBeDisabled()

    fireEvent.click(sendButton)

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith('c1', 'me', 'привет'),
    )
  })

  it('shows an error indicator when sendMessage fails', async () => {
    const api = mockChatApi({
      listMessages: vi.fn().mockResolvedValue({ data: [], error: null }),
      sendMessage: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'send failed' } }),
    })

    await renderThread()

    const sendButton = await waitFor(() =>
      screen.getByRole('button', { name: 'Отправить' }),
    )

    const textarea = screen.getByPlaceholderText('Ваше сообщение…')
    fireEvent.change(textarea, { target: { value: 'привет' } })
    fireEvent.click(sendButton)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument(),
    )
    expect(api.sendMessage).toHaveBeenCalled()
  })
})
