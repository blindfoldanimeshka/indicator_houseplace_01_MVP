import { useEffect, useState } from 'react'
import { getListing } from './api'
import type { Database } from '@/types/database'

type ListingRow = Database['public']['Tables']['listings']['Row']

const ROOMS_LABELS: Record<string, string> = {
  studio: 'Студия',
  '1': '1 комната',
  '2': '2 комнаты',
  '3': '3 комнаты',
  '4+': '4+ комнат',
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price)
}

interface ListingDetailProps {
  id: string
  onBack: () => void
}

export function ListingDetail({ id, onBack }: ListingDetailProps) {
  const [listing, setListing] = useState<ListingRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    getListing(id).then((result) => {
      if (result.error) {
        setError(result.error)
        setListing(null)
      } else {
        setListing((result.data as ListingRow) ?? null)
      }
      setLoading(false)
    })
  }, [id])

  return (
    <section className="max-w-2xl space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-teal-800 hover:underline"
      >
        ← Назад
      </button>

      {loading && <p className="text-sm text-stone-600">Загрузка…</p>}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      {!loading && !error && !listing && (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-600">
          Объявление не найдено.
        </p>
      )}

      {!loading && !error && listing && (
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              listing.type === 'offer'
                ? 'bg-teal-100 text-teal-900'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {listing.type === 'offer' ? 'Сдаётся' : 'Ищу'}
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            {listing.city}
          </h1>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Комнаты</dt>
              <dd className="font-medium text-stone-950">
                {ROOMS_LABELS[listing.rooms] ?? listing.rooms}
              </dd>
            </div>
            {listing.area && (
              <div>
                <dt className="text-stone-500">Площадь</dt>
                <dd className="font-medium text-stone-950">
                  {listing.area} м²
                </dd>
              </div>
            )}
            <div>
              <dt className="text-stone-500">Цена</dt>
              <dd className="font-medium text-stone-950">
                {formatPrice(listing.price)} ₽ / мес.
              </dd>
            </div>
          </dl>

          {listing.description && (
            <div>
              <h2 className="text-sm font-medium text-stone-500">Описание</h2>
              <p className="mt-1 whitespace-pre-wrap text-stone-800">
                {listing.description}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
