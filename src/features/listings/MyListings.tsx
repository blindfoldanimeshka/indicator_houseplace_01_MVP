import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types/database'
import { archiveListing } from './api'
import { ListingForm } from './ListingForm'

type ListingRow = Database['public']['Tables']['listings']['Row']

interface MyListingsProps {
  onBack: () => void
}

export function MyListings({ onBack }: MyListingsProps) {
  const { user } = useAuth()
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ListingRow | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    if (user) {
      getSupabaseClient()
        .from('listings')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error: queryError }) => {
          if (!active) return
          if (queryError) {
            setError(queryError.message)
            setListings([])
          } else {
            setListings((data as ListingRow[]) ?? [])
          }
          setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      active = false
    }
  }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await getSupabaseClient()
      .from('listings')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setListings([])
    } else {
      setListings((data as ListingRow[]) ?? [])
    }
    setLoading(false)
  }

  async function handleArchive(listing: ListingRow) {
    setArchivingId(listing.id)
    setArchiveError(null)
    const result = await archiveListing(listing.id, listing.author_id)
    setArchivingId(null)
    if (result.error) {
      setArchiveError(result.error)
      return
    }
    load()
  }

  if (editing) {
    return (
      <ListingForm
        initial={editing}
        onSaved={() => {
          setEditing(null)
          load()
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Назад
      </button>

      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Мои объявления
      </h1>

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      {archiveError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          {archiveError}
        </p>
      )}

      {!loading && !error && listings.length === 0 && (
        <p className="rounded-xl border border-border-muted bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
          У вас пока нет объявлений.
        </p>
      )}

      {!loading && !error && listings.length > 0 && (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const isArchived = Boolean(listing.deleted_at)
            return (
              <li
                key={listing.id}
                className="flex flex-col gap-3 rounded-2xl border border-border-muted bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {listing.city}
                    </span>
                    {isArchived && (
                      <span className="inline-flex items-center rounded-full bg-muted/80 px-2 py-0.5 text-xs font-semibold text-stone-700">
                        В архиве
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {listing.type === 'offer' ? 'Сдаётся' : 'Ищу'}, {listing.price} ₽
                  </p>
                </div>

                {!isArchived && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(listing)}
                      className="rounded-xl border border-border-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(listing)}
                      disabled={archivingId === listing.id}
                      className="rounded-xl border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {archivingId === listing.id ? 'Архивируем…' : 'Архивировать'}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
