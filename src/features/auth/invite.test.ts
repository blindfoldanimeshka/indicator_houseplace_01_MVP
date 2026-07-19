import { describe, expect, it, vi } from 'vitest'
import {
  isInviteCodeFormatValid,
  validateInviteCode,
  checkInviteStatus,
  inviteErrorMessage,
  type InviteStatus,
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

  it('validateInviteCode returns false without RPC for malformed code', async () => {
    const result = await validateInviteCode('bad-code')
    expect(result).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('checkInviteStatus maps RPC result to status', async () => {
    const cases: [string, InviteStatus][] = [
      ['valid', 'valid'],
      ['used', 'used'],
      ['expired', 'expired'],
      ['not_found', 'not_found'],
    ]
    for (const [rpcValue, expected] of cases) {
      rpc.mockResolvedValue({ data: rpcValue, error: null })
      expect(await checkInviteStatus('BETA-XYZ789')).toBe(expected)
    }

    rpc.mockResolvedValue({ data: null, error: new Error('x') })
    expect(await checkInviteStatus('BETA-XYZ789')).toBe('error')
  })

  it('validateInviteCode only true when status is valid', async () => {
    rpc.mockResolvedValue({ data: 'valid', error: null })
    expect(await validateInviteCode('BETA-XYZ789')).toBe(true)

    rpc.mockResolvedValue({ data: 'used', error: null })
    expect(await validateInviteCode('BETA-XYZ789')).toBe(false)
  })

  it('inviteErrorMessage gives specific messages', () => {
    expect(inviteErrorMessage('used')).toMatch(/уже использован/i)
    expect(inviteErrorMessage('expired')).toMatch(/истёк/i)
    expect(inviteErrorMessage('not_found')).toMatch(/не найден/i)
    expect(inviteErrorMessage('error')).toMatch(/не удалось проверить/i)
    expect(inviteErrorMessage('valid')).toMatch(/недействительн/i)
  })
})
