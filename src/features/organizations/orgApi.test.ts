import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { data: unknown; error: { message: string } | null }

function makeChain(result: Result) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: Result) => void) => resolve(result)),
  }
  return chain
}

function makeRpc(result: Result) {
  return {
    rpc: vi.fn().mockReturnValue({
      then: (resolve: (value: Result) => void) => resolve(result),
    }),
  }
}

const orgRow = { id: 'o1', name: 'Агентство', owner_id: 'u1', created_at: '', deleted_at: null }

describe('organizations api', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createOrganization calls rpc create_organization', async () => {
    const rpc = makeRpc({ data: 'o1', error: null })
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => rpc,
    }))
    const { createOrganization } = await import('./orgApi')
    const res = await createOrganization('Агентство')
    expect(rpc.rpc).toHaveBeenCalledWith('create_organization', { p_name: 'Агентство' })
    expect(res.data).toBe('o1')
  })

  it('listMyOrganizations fetches orgs from member ids', async () => {
    const memberChain = makeChain({ data: [{ org_id: 'o1' }], error: null })
    const orgChain = makeChain({ data: [orgRow], error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(orgChain)
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => ({ from }),
    }))
    const { listMyOrganizations } = await import('./orgApi')
    const res = await listMyOrganizations()
    expect(from).toHaveBeenCalledWith('organization_members')
    expect(from).toHaveBeenCalledWith('organizations')
    expect(orgChain.in).toHaveBeenCalledWith('id', ['o1'])
    expect(res.data).toEqual([orgRow])
  })

  it('addOrgMember calls rpc add_org_member with role', async () => {
    const rpc = makeRpc({ data: true, error: null })
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => rpc,
    }))
    const { addOrgMember } = await import('./orgApi')
    const res = await addOrgMember('o1', 'a@b.com', 'admin')
    expect(rpc.rpc).toHaveBeenCalledWith('add_org_member', {
      p_org: 'o1',
      p_user_email: 'a@b.com',
      p_role: 'admin',
    })
    expect(res.data).toBe(true)
  })
})
