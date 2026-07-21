import { getSupabaseClient } from '@/lib/supabase'

export interface TemplateResult<T> {
  data: T | null
  error: string | null
}

export async function listTemplates(): Promise<
  TemplateResult<{ id: string; title: string; body: string }[]>
> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('message_templates')
    .select('id, title, body')
    .order('created_at', { ascending: true })
  if (error) return { data: null, error: error.message }
  return { data: data as { id: string; title: string; body: string }[], error: null }
}

export async function addTemplate(
  title: string,
  body: string,
  userId: string,
): Promise<TemplateResult<string>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('message_templates')
    .insert({ user_id: userId, title, body })
    .select('id')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: (data as { id: string }).id, error: null }
}

export async function deleteTemplate(id: string): Promise<TemplateResult<boolean>> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: true, error: null }
}
