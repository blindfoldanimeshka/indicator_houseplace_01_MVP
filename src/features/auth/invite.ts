import { getSupabaseClient } from '@/lib/supabase'

export const INVITE_CODE_PATTERN = /^BETA-[A-Z0-9]{6}$/

export type InviteStatus = 'valid' | 'used' | 'expired' | 'not_found' | 'error'

export function isInviteCodeFormatValid(code: string): boolean {
  return INVITE_CODE_PATTERN.test(code.trim().toUpperCase())
}

export async function validateInviteCode(code: string): Promise<boolean> {
  const status = await checkInviteStatus(code)
  return status === 'valid'
}

export async function checkInviteStatus(code: string): Promise<InviteStatus> {
  const normalized = code.trim().toUpperCase()
  if (!isInviteCodeFormatValid(normalized)) {
    return 'not_found'
  }

  const { data, error } = await getSupabaseClient().rpc('invite_status', {
    p_code: normalized,
  })

  if (error) {
    return 'error'
  }

  return data as InviteStatus
}

export function inviteErrorMessage(status: InviteStatus): string {
  switch (status) {
    case 'used':
      return 'Этот инвайт-код уже использован. Запросите новый.'
    case 'expired':
      return 'Срок действия инвайт-кода истёк. Запросите новый.'
    case 'not_found':
      return 'Инвайт-код не найден. Проверьте формат (BETA-XXXXXX).'
    case 'error':
      return 'Не удалось проверить инвайт-код. Попробуйте позже.'
    default:
      return 'Недействительный инвайт-код.'
  }
}
