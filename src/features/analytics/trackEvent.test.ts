import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeSupabaseClient() {
  const invoke = vi.fn().mockResolvedValue({ error: null, data: { ok: true } })
  return {
    functions: { invoke },
    _invoke: invoke,
  }
}

describe('trackEvent (F12 funnel)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('invokes the track-event edge function with event_type and payload', async () => {
    const client = makeSupabaseClient()
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => client,
    }))

    const { trackEvent } = await import('./trackEvent')
    await trackEvent('open_chat', { listing_id: 'l1' })

    expect(client._invoke).toHaveBeenCalledWith('track-event', {
      body: { event_type: 'open_chat', payload: { listing_id: 'l1' } },
    })
  })

  it('omits payload when not provided', async () => {
    const client = makeSupabaseClient()
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => client,
    }))

    const { trackEvent } = await import('./trackEvent')
    await trackEvent('view_listing')

    const body = (client._invoke as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    expect(body).toEqual({ event_type: 'view_listing', payload: null })
  })

  it('swallows errors without throwing (analytics never breaks UX)', async () => {
    const client = {
      functions: {
        invoke: vi.fn().mockRejectedValue(new Error('network down')),
      },
    }
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => client,
    }))

    const { trackEvent } = await import('./trackEvent')
    await expect(trackEvent('send_message')).resolves.toBeUndefined()
  })
})
