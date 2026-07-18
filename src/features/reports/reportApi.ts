import { getSupabaseClient } from '@/lib/supabase'
import type { ReportTargetType } from './reportSchema'

export interface ReportApiResult<T> {
  data: T | null
  error: string | null
}

export interface CreateReportInput {
  targetType: ReportTargetType
  targetId: string
  category: string
  comment: string
}

const UNIQUE_VIOLATION = '23505'

export async function createReport(
  input: CreateReportInput,
  reporterId: string,
): Promise<ReportApiResult<{ id: string }>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      category: input.category,
      comment: input.comment,
      status: 'new',
    })
    .select()
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { data: null, error: 'already_reported' }
    }
    return { data: null, error: error.message }
  }

  return { data: data as { id: string }, error: null }
}

export async function getMyReport(
  targetType: ReportTargetType,
  targetId: string,
  reporterId: string,
): Promise<ReportApiResult<{ id: string; status: string }>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('reporter_id', reporterId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as { id: string; status: string } | null, error: null }
}
