import { getSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type OrgRow = Database['public']['Tables']['organizations']['Row']
type OrgMemberRow = Database['public']['Tables']['organization_members']['Row']

export interface OrgApiResult<T> {
  data: T | null
  error: string | null
}

export async function createOrganization(
  name: string,
): Promise<OrgApiResult<string>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: name,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as string, error: null }
}

export async function listMyOrganizations(): Promise<
  OrgApiResult<OrgRow[]>
> {
  const supabase = getSupabaseClient()
  const { data: memberRows, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (memberError) return { data: null, error: memberError.message }
  const ids = (memberRows as Array<{ org_id: string }>).map((r) => r.org_id)
  if (ids.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .in('id', ids)
    .is('deleted_at', null)
  if (error) return { data: null, error: error.message }
  return { data: data as OrgRow[], error: null }
}

export async function addOrgMember(
  orgId: string,
  email: string,
  role: 'owner' | 'admin' | 'member' = 'member',
): Promise<OrgApiResult<boolean>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('add_org_member', {
    p_org: orgId,
    p_user_email: email,
    p_role: role,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as boolean, error: null }
}

export async function listOrgMembers(
  orgId: string,
): Promise<OrgApiResult<OrgMemberRow[]>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) return { data: null, error: error.message }
  return { data: data as OrgMemberRow[], error: null }
}

export type { OrgRow, OrgMemberRow }
