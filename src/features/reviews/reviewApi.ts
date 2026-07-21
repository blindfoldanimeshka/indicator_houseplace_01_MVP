import { getSupabaseClient } from '@/lib/supabase'

export interface ReviewResult<T> {
  data: T | null
  error: string | null
}

export async function createReview(
  chatId: string,
  revieweeId: string,
  rating: number,
  comment?: string,
): Promise<ReviewResult<string>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_review', {
    p_chat_id: chatId,
    p_reviewee_id: revieweeId,
    p_rating: rating,
    p_comment: comment ?? null,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as string, error: null }
}

export async function listReviewsForUser(
  userId: string,
): Promise<ReviewResult<{ rating: number; comment: string | null; created_at: string }[]>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('rating, comment, created_at')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return {
    data: data as { rating: number; comment: string | null; created_at: string }[],
    error: null,
  }
}
