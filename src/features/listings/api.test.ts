import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { data: unknown; error: { message: string } | null }

function makeChain(result: Result) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: Result) => void) => resolve(result)),
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

const validValues = {
  type: 'offer' as const,
  city: 'Москва',
  rooms: '1' as const,
  price: 50000,
  area: 40,
  description: 'Светлая квартира',
  address: '',
  lat: null,
  lng: null,
}

describe('listings api', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createListing inserts author_id and status:active and returns data', async () => {
    const result = { data: { id: 'l1' }, error: null }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { createListing } = await import('./api')
    const res = await createListing(validValues, 'u1')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'u1', status: 'active' }),
    )
    expect(res.error).toBeNull()
    expect(res.data).toEqual({ id: 'l1' })
  })

  it('createListing returns the error object on failure without throwing', async () => {
    const result = { data: null, error: { message: 'boom' } }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { createListing } = await import('./api')
    const res = await createListing(validValues, 'u1')

    expect(chain.insert).toHaveBeenCalled()
    expect(res.error).toBe('boom')
    expect(res.data).toBeNull()
  })

  it('createListing passes org_id and fires create_listing tracking on success', async () => {
    const result = { data: { id: 'l1' }, error: null }
    const chain = makeChain(result)
    mockSupabase(chain)

    const trackEvent = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/features/analytics/trackEvent', () => ({ trackEvent }))

    const { createListing } = await import('./api')
    const res = await createListing(validValues, 'u1', 'org-9')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'u1', org_id: 'org-9' }),
    )
    expect(trackEvent).toHaveBeenCalledWith('create_listing', { listing_id: 'l1' })
    expect(res.error).toBeNull()
  })

  it('listListings popular sort orders by listing_stats.views desc', async () => {
    const result = { data: [], error: null, count: 0 }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { listListings } = await import('./api')
    await listListings({ sort: 'popular' }, 0)

    expect(chain.order).toHaveBeenCalledWith('views', {
      ascending: false,
      foreignTable: 'listing_stats',
    })
    expect(chain.select).toHaveBeenCalledWith('*, listing_stats(views, responses)', {
      count: 'exact',
    })
  })

  it('updateListing chains update(id).eq(author_id)', async () => {
    const result = { data: { id: 'l1' }, error: null }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { updateListing } = await import('./api')
    await updateListing('l1', 'u1', validValues)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'offer', city: 'Москва' }),
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'l1')
    expect(chain.eq).toHaveBeenCalledWith('author_id', 'u1')
  })

  it('archiveListing sets deleted_at to a string', async () => {
    const result = { data: { id: 'l1' }, error: null }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { archiveListing } = await import('./api')
    await archiveListing('l1', 'u1')

    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      deleted_at: string
    }
    expect(typeof updateArg.deleted_at).toBe('string')
    expect(chain.eq).toHaveBeenCalledWith('id', 'l1')
    expect(chain.eq).toHaveBeenCalledWith('author_id', 'u1')
  })

  it('getListing calls select().eq(id).maybeSingle()', async () => {
    const result = { data: { id: 'l1' }, error: null }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { getListing } = await import('./api')
    await getListing('l1')

    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('id', 'l1')
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('listListings applies status/active, deleted_at null, order and range for page 0', async () => {
    const result = { data: [], error: null, count: 0 }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { listListings } = await import('./api')
    await listListings({}, 0)

    expect(chain.eq).toHaveBeenCalledWith('status', 'active')
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null)
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.range).toHaveBeenCalledWith(0, 9)
  })

  it('listListings applies filters', async () => {
    const result = { data: [], error: null, count: 0 }
    const chain = makeChain(result)
    mockSupabase(chain)

    const { listListings } = await import('./api')
    await listListings(
      { type: 'offer', city: 'Моск', rooms: '1', maxPrice: 50000 },
      0,
    )

    expect(chain.eq).toHaveBeenCalledWith('type', 'offer')
    expect(chain.ilike).toHaveBeenCalledWith('city', '%Моск%')
    expect(chain.eq).toHaveBeenCalledWith('rooms', '1')
    expect(chain.lte).toHaveBeenCalledWith('price', 50000)
  })
})
