import { useEffect, useState } from 'react'
import type { Database } from '@/types/database'
import type { ListingFilters } from './types'
import { listListings } from './api'
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
}

export function Feed({ onOpen }: FeedProps) {
  const [filters, setFilters] = useState<ListingFilters>({})
  const [listings, setListings] = useState<ListingRow[]>([])
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

  function updateFilter(patch: Partial<ListingFilters>) {
    setPage(0)
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const inputClass =
    'rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200'

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          Объявления
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Аренда жилья напрямую, без посредников.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <label className="block">
          <span className="text-xs font-medium text-stone-700">Тип</span>
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

        <label className="block">
          <span className="text-xs font-medium text-stone-700">Город</span>
          <input
            type="text"
            value={filters.city ?? ''}
            onChange={(event) => updateFilter({ city: event.target.value || undefined })}
            placeholder="Например, Москва"
            className={`${inputClass} mt-1 w-full`}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-stone-700">Комнаты</span>
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

        <label className="block">
          <span className="text-xs font-medium text-stone-700">
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

        <label className="block">
          <span className="text-xs font-medium text-stone-700">Сортировка</span>
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

      {loading && <p className="text-sm text-stone-600">Загрузка…</p>}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      {!loading && !error && listings.length === 0 && (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-600">
          Объявлений не найдено. Попробуйте изменить фильтры.
        </p>
      )}

      {!loading && !error && listings.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onOpen={onOpen}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-stone-700">
            <span>
              Всего: {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl border border-stone-300 px-3 py-1.5 font-medium transition hover:bg-stone-100 disabled:opacity-40"
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
                className="rounded-xl border border-stone-300 px-3 py-1.5 font-medium transition hover:bg-stone-100 disabled:opacity-40"
              >
                Вперёд →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
