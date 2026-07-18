import { beforeEach, describe, expect, it, vi } from 'vitest'

interface DbResult {
  data: unknown
  error: { message: string; code?: string } | null
}

function makeChain(result: DbResult) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: DbResult) => void) => resolve(result)),
  }
  return chain
}

function mockSupabase(chain: ReturnType<typeof makeChain>) {
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseClient: () => ({
      from: vi.fn(() => chain),
    }),
  }))
}

describe('reportApi', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createReport inserts reporter_id and status:new and returns the row', async () => {
    const chain = makeChain({ data: { id: 'r1' }, error: null })
    mockSupabase(chain)

    const { createReport } = await import('./reportApi')
    const res = await createReport(
      { targetType: 'listing', targetId: 'l1', category: 'Спам', comment: 'x' },
      'me',
    )

    expect(chain.insert).toHaveBeenCalledWith({
      reporter_id: 'me',
      target_type: 'listing',
      target_id: 'l1',
      category: 'Спам',
      comment: 'x',
      status: 'new',
    })
    expect(res.error).toBeNull()
    expect(res.data).toEqual({ id: 'r1' })
  })

  it('createReport maps unique-violation (23505) to already_reported', async () => {
    const chain = makeChain({
      data: null,
      error: { message: 'dup', code: '23505' },
    })
    mockSupabase(chain)

    const { createReport } = await import('./reportApi')
    const res = await createReport(
      { targetType: 'listing', targetId: 'l1', category: 'Спам', comment: 'x' },
      'me',
    )

    expect(res).toEqual({ data: null, error: 'already_reported' })
  })

  it('createReport returns generic error message on other error', async () => {
    const chain = makeChain({
      data: null,
      error: { message: 'boom' },
    })
    mockSupabase(chain)

    const { createReport } = await import('./reportApi')
    const res = await createReport(
      { targetType: 'listing', targetId: 'l1', category: 'Спам', comment: 'x' },
      'me',
    )

    expect(res.data).toBeNull()
    expect(res.error).toBe('boom')
  })

  it('getMyReport calls select().eq(target_type).eq(target_id).eq(reporter_id).maybeSingle()', async () => {
    const chain = makeChain({ data: { id: 'r1', status: 'new' }, error: null })
    mockSupabase(chain)

    const { getMyReport } = await import('./reportApi')
    const res = await getMyReport('chat', 'c1', 'me')

    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('target_type', 'chat')
    expect(chain.eq).toHaveBeenCalledWith('target_id', 'c1')
    expect(chain.eq).toHaveBeenCalledWith('reporter_id', 'me')
    expect(chain.maybeSingle).toHaveBeenCalled()
    expect(res.data).toEqual({ id: 'r1', status: 'new' })
  })
})
