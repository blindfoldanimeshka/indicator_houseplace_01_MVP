import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { data: unknown; error: { message: string } | null }

function makeChain(result: Result) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: Result) => void) => resolve(result)),
  }
  return chain
}

function mockSupabase(chain: ReturnType<typeof makeChain>) {
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseClient: () => ({ from: vi.fn(() => chain) }),
  }))
}

describe('templatesApi', () => {
  beforeEach(() => vi.resetModules())

  it('listTemplates selects id,title,body', async () => {
    const chain = makeChain({ data: [], error: null })
    mockSupabase(chain)
    const { listTemplates } = await import('./templatesApi')
    await listTemplates()
    expect(chain.select).toHaveBeenCalledWith('id, title, body')
  })

  it('addTemplate inserts user_id/title/body and returns id', async () => {
    const chain = makeChain({ data: { id: 't1' }, error: null })
    mockSupabase(chain)
    const { addTemplate } = await import('./templatesApi')
    const res = await addTemplate('Привет', 'Здравствуйте', 'u1')
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      title: 'Привет',
      body: 'Здравствуйте',
    })
    expect(res.data).toBe('t1')
  })
})
