import { describe, expect, it, vi } from 'vitest'
import {
  isInviteCodeFormatValid,
  validateInviteCode,
} from '@/features/auth/invite'

const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}))

describe('invite', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('validates BETA-XXXXXX format case-insensitively', () => {
    expect(isInviteCodeFormatValid('BETA-ABC123')).toBe(true)
    expect(isInviteCodeFormatValid('beta-abc123')).toBe(true)
    expect(isInviteCodeFormatValid('BETA-ABC12')).toBe(false)
    expect(isInviteCodeFormatValid('HELLO-ABC123')).toBe(false)
    expect(isInviteCodeFormatValid('')).toBe(false)
  })

  it('returns false without RPC call for malformed code', async () => {
    const result = await validateInviteCode('bad-code')
    expect(result).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns true when RPC says invite is valid', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    const result = await validateInviteCode('beta-xyz789')
    expect(result).toBe(true)
    expect(rpc).toHaveBeenCalledWith('is_invite_valid', {
      p_code: 'BETA-XYZ789',
    })
  })

  it('returns false when RPC errors or returns falsy', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    expect(await validateInviteCode('BETA-XYZ789')).toBe(false)

    rpc.mockResolvedValue({ data: null, error: new Error('x') })
    expect(await validateInviteCode('BETA-XYZ789')).toBe(false)
  })
})
