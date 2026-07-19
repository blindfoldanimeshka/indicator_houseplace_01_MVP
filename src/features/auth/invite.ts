import { getSupabaseClient } from '@/lib/supabase'

export const INVITE_CODE_PATTERN = /^BETA-[A-Z0-9]{6}$/

export function isInviteCodeFormatValid(code: string): boolean {
  return INVITE_CODE_PATTERN.test(code.trim().toUpperCase())
}

export async function validateInviteCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase()
  if (!isInviteCodeFormatValid(normalized)) {
    return false
  }

  const { data, error } = await getSupabaseClient().rpc('is_invite_valid', {
    p_code: normalized,
  })

  if (error) {
    return false
  }

  return Boolean(data)
}
