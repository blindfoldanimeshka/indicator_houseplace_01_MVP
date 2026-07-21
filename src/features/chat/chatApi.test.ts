import { beforeEach, describe, expect, it, vi } from 'vitest'

interface DbResult {
  data: unknown
  error: { message: string } | null
}

function makeDbChain(result: DbResult) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: DbResult) => void) => resolve(result)),
  }
  return chain
}

function makeChannel() {
  const on = vi.fn().mockReturnValue({
    subscribe: vi.fn((cb?: (status: string) => void) => {
      if (cb) {
        cb('SUBSCRIBED')
      }
      return { unsubscribe: vi.fn() }
    }),
  })
  return { channel: { on, subscribe: vi.fn() }, removeChannel: vi.fn() }
}

let dbChain: ReturnType<typeof makeDbChain>
let channelMock: ReturnType<typeof makeChannel>
let rpcMock: ReturnType<typeof vi.fn>

interface MockSupabase {
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
}

function mockSupabase(dbResult: DbResult, rpcResult?: DbResult) {
  dbChain = makeDbChain(dbResult)
  channelMock = makeChannel()
  rpcMock = vi.fn().mockResolvedValue(rpcResult ?? { data: 'chat-1', error: null })

  const client: MockSupabase = {
    from: vi.fn(() => dbChain),
    rpc: rpcMock,
    channel: vi.fn(() => channelMock.channel),
    removeChannel: channelMock.removeChannel,
  }

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseClient: () => client,
  }))
}

describe('chatApi', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useRealTimers()
  })

  it('openOrCreateChat calls rpc with the listing id', async () => {
    mockSupabase({ data: null, error: null }, { data: 'chat-9', error: null })
    const { openOrCreateChat } = await import('./chatApi')

    const res = await openOrCreateChat('listing-x')

    expect(rpcMock).toHaveBeenCalledWith('open_or_create_chat', {
      p_listing_id: 'listing-x',
    })
    expect(res.error).toBeNull()
    expect(res.data).toBe('chat-9')
  })

  it('openOrCreateChat returns the error message on failure', async () => {
    mockSupabase(
      { data: null, error: null },
      { data: null, error: { message: 'bad' } },
    )
    const { openOrCreateChat } = await import('./chatApi')

    const res = await openOrCreateChat('listing-x')
    expect(res.data).toBeNull()
    expect(res.error).toBe('bad')
  })

  it('listMyChats selects chats joined to listings', async () => {
    const rows = [{ id: 'c1', listings: { city: 'Москва', type: 'offer' } }]
    mockSupabase({ data: rows, error: null })
    const { listMyChats } = await import('./chatApi')

    const res = await listMyChats()
    expect(res.error).toBeNull()
    expect(res.data).toEqual(rows)
    expect(dbChain.select).toHaveBeenCalledWith(
      expect.stringContaining('listings'),
    )
    expect(dbChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('listMessages filters by chat_id and orders ascending', async () => {
    const rows = [{ id: 'm1', chat_id: 'c1', text: 'hi' }]
    mockSupabase({ data: rows, error: null })
    const { listMessages } = await import('./chatApi')

    const res = await listMessages('c1')
    expect(res.error).toBeNull()
    expect(res.data).toEqual(rows)
    expect(dbChain.eq).toHaveBeenCalledWith('chat_id', 'c1')
    expect(dbChain.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('sendMessage inserts with sender_id from argument', async () => {
    mockSupabase({ data: { id: 'm1' }, error: null })
    const { sendMessage } = await import('./chatApi')

    const res = await sendMessage('c1', 'user-7', 'привет')
    expect(res.error).toBeNull()
    expect(dbChain.insert).toHaveBeenCalledWith({
      chat_id: 'c1',
      sender_id: 'user-7',
      text: 'привет',
      attachment_path: null,
      attachment_type: null,
    })
  })

  it('subscribeMessages subscribes with the chat_id filter', async () => {
    mockSupabase({ data: [], error: null })
    const { subscribeMessages } = await import('./chatApi')

    const onInsert = vi.fn()
    const cleanup = subscribeMessages('c1', onInsert)

    expect(channelMock.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'messages',
        filter: 'chat_id=eq.c1',
      }),
      expect.any(Function),
    )
    cleanup()
    expect(channelMock.removeChannel).toHaveBeenCalled()
  })

  it('subscribeMessages calls onInsert for realtime payloads', async () => {
    mockSupabase({ data: [], error: null })
    const { subscribeMessages } = await import('./chatApi')

    let handler: ((payload: { new: unknown }) => void) | undefined
    channelMock.channel.on = vi.fn((_e, _opts, cb) => {
      handler = cb
      return {
        subscribe: vi.fn((cbSubscribe?: (s: string) => void) => {
          if (cbSubscribe) cbSubscribe('SUBSCRIBED')
          return { unsubscribe: vi.fn() }
        }),
      }
    })

    const onInsert = vi.fn()
    const cleanup = subscribeMessages('c1', onInsert)

    handler?.({ new: { id: 'm1', chat_id: 'c1', created_at: 't' } })
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
    )
    cleanup()
  })

  it('subscribeMessages falls back to polling on channel error', async () => {
    vi.useFakeTimers()
    let call = 0
    const first = [{ id: 'm1', chat_id: 'c1', created_at: 't1', sender_id: 'u' }]
    const second = [
      ...first,
      { id: 'm2', chat_id: 'c1', created_at: 't2', sender_id: 'u' },
    ]
    const dbChainDynamic = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (value: DbResult) => void) =>
        resolve({ data: call === 0 ? first : second, error: null }),
      ),
    }
    call = 0
    const getRows = () => (call++ === 0 ? first : second)
    dbChainDynamic.then = vi.fn((resolve: (value: DbResult) => void) => {
      resolve({ data: getRows(), error: null })
    })

    const client = {
      from: vi.fn(() => dbChainDynamic),
      rpc: vi.fn().mockResolvedValue({ data: 'c1', error: null }),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn((cb?: (s: string) => void) => {
            if (cb) cb('CHANNEL_ERROR')
          }),
        })),
      })),
      removeChannel: vi.fn(),
    }
    vi.doMock('@/lib/supabase', () => ({ getSupabaseClient: () => client }))

    const { subscribeMessages } = await import('./chatApi')

    const onInsert = vi.fn()
    const cleanup = subscribeMessages('c1', onInsert)

    await vi.advanceTimersByTimeAsync(4000)
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2' }),
    )
    cleanup()
  })
})
