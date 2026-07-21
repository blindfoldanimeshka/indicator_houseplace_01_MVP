import { useEffect, useState } from 'react'
import {
  addOrgMember,
  createOrganization,
  listMyOrganizations,
  listOrgMembers,
} from '@/features/organizations/orgApi'
import type { OrgRow } from '@/features/organizations/orgApi'

export function OrganizationsTab() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const [activeOrg, setActiveOrg] = useState<string | null>(null)
  const [members, setMembers] = useState<
    { org_id: string; user_id: string; role: string }[]
  >([])
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member')

  useEffect(() => {
    let active = true
    setLoading(true)
    listMyOrganizations().then((res) => {
      if (!active) return
      if (res.error) setError(res.error)
      else {
        setOrgs(res.data ?? [])
        if (res.data && res.data.length > 0) setActiveOrg(res.data[0].id)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!activeOrg) {
      setMembers([])
      return
    }
    let active = true
    listOrgMembers(activeOrg).then((res) => {
      if (!active) return
      setMembers(res.data ?? [])
    })
    return () => {
      active = false
    }
  }, [activeOrg])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    const res = await createOrganization(name.trim())
    setCreating(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setName('')
    const refreshed = await listMyOrganizations()
    if (refreshed.data) {
      setOrgs(refreshed.data)
      if (res.data) setActiveOrg(res.data)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrg || !memberEmail.trim()) return
    setError(null)
    const res = await addOrgMember(activeOrg, memberEmail.trim(), memberRole)
    if (res.error) {
      setError(res.error)
      return
    }
    setMemberEmail('')
    const refreshed = await listOrgMembers(activeOrg)
    if (refreshed.data) setMembers(refreshed.data)
  }

  return (
    <div className="space-y-6">
      <div className="surface-elevated rounded-2xl p-6 shadow-[var(--shadow-surface)]">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Мои организации
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Объединяйте объявления агентства или команды арендодателей.
        </p>

        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название организации"
            className="flex-1 rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-secondary/40"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            Создать
          </button>
        </form>

        {loading && <p className="mt-4 text-sm text-muted-foreground">Загрузка…</p>}
        {!loading && orgs.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Организаций пока нет. Создайте первую.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setActiveOrg(org.id)}
              className={[
                'rounded-xl border px-3 py-2 text-sm transition',
                activeOrg === org.id
                  ? 'border-primary bg-secondary/20 text-foreground'
                  : 'border-border-muted bg-surface text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {org.name}
            </button>
          ))}
        </div>
      </div>

      {activeOrg && (
        <div className="surface-elevated rounded-2xl p-6 shadow-[var(--shadow-surface)]">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Участники
          </h3>

          <ul className="mt-3 space-y-1 text-sm">
            {members.map((m) => (
              <li key={`${m.org_id}-${m.user_id}`} className="flex gap-2 text-muted-foreground">
                <span className="text-foreground">{m.user_id.slice(0, 8)}</span>
                <span className="rounded bg-muted/40 px-2 py-0.5 text-xs">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember} className="mt-4 flex gap-2">
            <input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="email участника"
              className="flex-1 rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-secondary/40"
            />
            <select
              value={memberRole}
              onChange={(e) =>
                setMemberRole(e.target.value as 'admin' | 'member')
              }
              className="rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none"
            >
              <option value="member">Участник</option>
              <option value="admin">Админ</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Добавить
            </button>
          </form>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950">{error}</p>
      )}
    </div>
  )
}
