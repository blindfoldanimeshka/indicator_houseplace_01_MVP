import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Database } from '@/types/database'
import type { ListingFilters } from './types'
import { listListings } from './api'
import { listCoverPaths } from '@/features/photos/photoApi'
import { getMockPhotoUrl } from './mockPhotos'
import { ListingCard } from './ListingCard'

type ListingRow = Database['public']['Tables']['listings']['Row']

const ROOMS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Любые' },
  { value: 'studio', label: 'Студия' },
  { value: '1', label: '1 комната' },
  { value: '2', label: '2 комнаты' },
  { value: '3', label: '3 комнаты' },
  { value: '4+', label: '4+ комнат' },
]

const PAGE_SIZE = 10

interface FeedProps {
  onOpen: (listing: ListingRow) => void
  onCreate?: () => void
}

export function Feed({ onOpen, onCreate }: FeedProps) {
  const [filters, setFilters] = useState<ListingFilters>({})
  const [listings, setListings] = useState<ListingRow[]>([])
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listListings(filters, page, PAGE_SIZE).then((result) => {
      if (!active) return
      if (result.error) {
        setError(result.error)
        setListings([])
      } else {
        setListings((result.data as ListingRow[]) ?? [])
        setTotal(result.count ?? 0)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [filters, page])

  useEffect(() => {
    if (listings.length === 0) {
      setCovers({})
      return
    }

    let active = true
    const covers: Record<string, string> = {}
    listings.forEach((listing, index) => {
      if (listing.is_mock) {
        covers[listing.id] = getMockPhotoUrl(index)
      }
    })
    const ids = listings
      .filter((listing) => !listing.is_mock)
      .map((listing) => listing.id)
    if (ids.length === 0) {
      setCovers(covers)
      return
    }
    listCoverPaths(ids).then((result) => {
      if (!active) return
      if (result.data) {
        Object.assign(covers, result.data)
      }
      setCovers(covers)
    })

    return () => {
      active = false
    }
  }, [listings])

  function updateFilter(patch: Partial<ListingFilters>) {
    setPage(0)
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const inputClass =
    'rounded-[8px] border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)]'

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
          Объявления
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Аренда жилья СКВОТ, без посредников.
        </p>
      </div>

      <div className="surface-elevated grid grid-cols-2 gap-3 rounded-[8px] border border-border-muted p-5 shadow-[var(--shadow-surface)] sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end lg:gap-3">
        <label className="block lg:w-auto">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Тип</span>
          <select
            value={filters.type ?? ''}
            onChange={(event) =>
              updateFilter({
                type: (event.target.value || undefined) as
                  | 'offer'
                  | 'request'
                  | undefined,
              })
            }
            className={`${inputClass} mt-1 w-full`}
          >
            <option value="">Все</option>
            <option value="offer">Сдают</option>
            <option value="request">Ищут</option>
          </select>
        </label>

        <label className="block lg:w-auto">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Город</span>
          <input
            type="text"
            value={filters.city ?? ''}
            onChange={(event) => updateFilter({ city: event.target.value || undefined })}
            placeholder="Например, Москва"
            className={`${inputClass} mt-1 w-full`}
          />
        </label>

        <label className="block lg:w-auto">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Комнаты</span>
          <select
            value={filters.rooms ?? ''}
            onChange={(event) =>
              updateFilter({ rooms: event.target.value || undefined })
            }
            className={`${inputClass} mt-1 w-full`}
          >
            {ROOMS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:w-auto">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Цена до, ₽
          </span>
          <input
            type="number"
            value={filters.maxPrice ?? ''}
            onChange={(event) =>
              updateFilter({
                maxPrice: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            placeholder="Любая"
            className={`${inputClass} mt-1 w-full`}
          />
        </label>

        <label className="block lg:w-auto">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Сортировка</span>
          <select
            value={filters.sort ?? 'newest'}
            onChange={(event) =>
              updateFilter({
                sort: (event.target.value || undefined) as 'newest' | undefined,
              })
            }
            className={`${inputClass} mt-1 w-full`}
          >
            <option value="newest">Сначала новые</option>
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="surface-elevated rounded-2xl border border-border-muted p-10 text-center shadow-[var(--shadow-surface)]">
          <p className="text-sm text-muted-foreground">
            Объявлений не найдено. Попробуйте изменить фильтры.
          </p>
        </div>
      )}

      {!loading && !error && listings.length > 0 && (
        <>
          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          >
            {listings.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  delay: Math.min(i * 0.04, 0.3),
                }}
              >
                <ListingCard
                  listing={listing}
                  coverPath={covers[listing.id]}
                  onOpen={onOpen}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Всего: {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl border border-border-muted bg-surface px-3 py-1.5 font-medium transition-all duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/50 hover:text-primary disabled:opacity-40"
              >
                ← Назад
              </button>
              <span className="px-2 py-1.5">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="rounded-xl border border-border-muted bg-surface px-3 py-1.5 font-medium transition-all duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/50 hover:text-primary disabled:opacity-40"
              >
                Вперёд →
              </button>
            </div>
          </div>

          <div className="mt-8 flex h-[86px] items-center justify-center gap-4 rounded-[8px] border border-border-muted bg-surface shadow-[var(--shadow-surface)]">
            <button
              type="button"
              onClick={() => setFilters({})}
              className="rounded-[8px] border border-border-muted bg-muted/40 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-muted/60"
            >
              Сбросить фильтры
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:opacity-90"
            >
              Подать объявление
            </button>
          </div>
        </>
      )}
    </section>
  )
}
