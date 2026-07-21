import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { data: unknown; error: { message: string } | null }

function makeRpc(result: Result) {
  return {
    rpc: vi.fn().mockReturnValue({
      then: (resolve: (value: Result) => void) => resolve(result),
    }),
  }
}

describe('reviewApi', () => {
  beforeEach(() => vi.resetModules())

  it('createReview calls rpc create_review with rating and optional comment', async () => {
    const rpc = makeRpc({ data: 'r1', error: null })
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => rpc,
    }))
    const { createReview } = await import('./reviewApi')
    const res = await createReview('c1', 'u2', 5, 'Отлично')
    expect(rpc.rpc).toHaveBeenCalledWith('create_review', {
      p_chat_id: 'c1',
      p_reviewee_id: 'u2',
      p_rating: 5,
      p_comment: 'Отлично',
    })
    expect(res.data).toBe('r1')
  })

  it('createReview passes null comment when omitted', async () => {
    const rpc = makeRpc({ data: 'r2', error: null })
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => rpc,
    }))
    const { createReview } = await import('./reviewApi')
    await createReview('c1', 'u2', 4)
    expect(rpc.rpc).toHaveBeenCalledWith('create_review', {
      p_chat_id: 'c1',
      p_reviewee_id: 'u2',
      p_rating: 4,
      p_comment: null,
    })
  })
})
