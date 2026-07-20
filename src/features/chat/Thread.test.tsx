import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
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

function mockTemplates() {
  vi.doMock('@/features/chat/templatesApi', () => ({
    listTemplates: vi.fn().mockResolvedValue({ data: [], error: null }),
    addTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  }))
}

function mockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'open' }, error: null }),
  }
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseClient: () => ({ from: vi.fn(() => chain) }),
  }))
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
    mockTemplates()
    mockSupabase()
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
      expect(api.sendMessage).toHaveBeenCalledWith('c1', 'me', 'привет', null),
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

describe('Thread auto-scroll guard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/features/auth/useAuth', () => ({
      useAuth: () => ({ user: { id: 'me' } }),
    }))
    mockTemplates()
    mockSupabase()
  })

  it('skips auto-scroll on mount but scrolls when a new message arrives', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy

    // Empty initial load: no growth, so the mount guard must not auto-scroll.
    const api = mockChatApi({
      listMessages: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    await renderThread()

    // On mount (and after the empty initial load) no auto-scroll should fire.
    expect(scrollSpy).not.toHaveBeenCalled()

    // Simulate a new incoming message after the thread is already open.
    const onInsert = api.subscribeMessages.mock.calls[0][1]
    act(() => {
      onInsert({
        id: 'm1',
        chat_id: 'c1',
        sender_id: 'other',
        text: 'привет',
        created_at: 't',
      })
    })

    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())
  })
})
