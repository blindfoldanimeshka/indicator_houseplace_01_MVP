import { useEffect, useState } from 'react'
import { getListing, boostListing } from './api'
import { listPhotos, getPublicUrl } from '@/features/photos/photoApi'
import { getMockPhotoUrl } from './mockPhotos'
import { useAuth } from '@/features/auth/useAuth'
import { openOrCreateChat } from '@/features/chat/chatApi'
import { ReportButton } from '@/features/reports/ReportButton'
import { MapView } from './MapView'
import { MorphHeading } from '@/components/MorphHeading'
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
  onStartChat?: (chatId: string) => void
}

export function ListingDetail({ id, onBack, onStartChat }: ListingDetailProps) {
  const { user } = useAuth()
  const [listing, setListing] = useState<ListingRow | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [boosting, setBoosting] = useState(false)
  const [boostError, setBoostError] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false

    if (listing?.is_mock) {
      setPhotos([getMockPhotoUrl(0), getMockPhotoUrl(1), getMockPhotoUrl(2)])
      return
    }

    listPhotos(id).then((result) => {
      if (cancelled) return
      if (result.data) {
        setPhotos(result.data.map((row) => getPublicUrl(row.path)))
      }
    })

    return () => {
      cancelled = true
    }
  }, [id, listing?.is_mock])

  async function handleStartChat() {
    if (!listing || !onStartChat) return
    setChatLoading(true)
    setChatError(null)
    const result = await openOrCreateChat(listing.id)
    setChatLoading(false)
    if (result.error || !result.data) {
      setChatError(result.error ?? 'Не удалось начать диалог.')
      return
    }
    onStartChat(result.data)
  }

  async function handleBoost() {
    if (!listing) return
    setBoosting(true)
    setBoostError(null)
    const result = await boostListing(listing.id)
    setBoosting(false)
    if (result.error) {
      setBoostError(result.error)
      return
    }
    const refreshed = await getListing(listing.id)
    if (refreshed.data) setListing(refreshed.data as ListingRow)
  }

  return (
    <section className="max-w-2xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Назад
      </button>

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      {!loading && !error && !listing && (
        <p className="rounded-xl bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
          Объявление не найдено.
        </p>
      )}

      {!loading && !error && listing && (
        <div className="space-y-6 rounded-2xl bg-surface shadow-[var(--shadow-raised)] p-6 sm:p-8">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={`Фото: ${listing.city}`}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl object-cover hover:scale-[1.03] transition duration-[var(--duration-base)]"
                />
              ))}
            </div>
          )}

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              listing.type === 'offer'
                ? 'border border-primary/30 bg-primary/20 text-primary'
                : 'border border-secondary/30 bg-secondary/20 text-secondary'
            }`}
          >
            {listing.type === 'offer' ? 'Сдаётся' : 'Ищу'}
          </span>

          {listing.is_mock && (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              MOCK
            </span>
          )}

          {listing.promoted_until && new Date(listing.promoted_until) > new Date() && (
            <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-700">
              Продвигается
            </span>
          )}

      <MorphHeading
        text={listing.city}
        className="font-display text-3xl tracking-tight text-foreground"
      />

          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="surface-elevated rounded-lg px-3 py-2">
              <dt className="text-muted-foreground">Комнаты</dt>
              <dd className="font-medium text-foreground">
                {ROOMS_LABELS[listing.rooms] ?? listing.rooms}
              </dd>
            </div>
            {listing.area && (
              <div className="surface-elevated rounded-lg px-3 py-2">
                <dt className="text-muted-foreground">Площадь</dt>
                <dd className="font-medium text-foreground">
                  {listing.area} м²
                </dd>
              </div>
            )}
            <div className="surface-elevated rounded-lg px-3 py-2">
              <dt className="text-muted-foreground">Цена</dt>
              <dd className="font-medium text-foreground">
                {formatPrice(listing.price)} ₽ / мес.
              </dd>
            </div>
          </dl>

          {listing.description && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Описание</h2>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {listing.description}
              </p>
            </div>
          )}

          {listing.address && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Адрес</h2>
              <p className="mt-1 text-foreground">{listing.address}</p>
            </div>
          )}

          {listing.lat !== null && listing.lng !== null && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">На карте</h2>
              <div className="mt-2">
                <MapView
                  lat={listing.lat}
                  lng={listing.lng}
                  address={listing.address}
                  height={300}
                />
              </div>
            </div>
          )}

          {user && listing.author_id !== user.id && onStartChat && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleStartChat}
                disabled={chatLoading}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition duration-[var(--duration-base)] ease-[var(--ease-smooth)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {chatLoading ? 'Открываем диалог…' : 'Написать автору'}
              </button>
              {chatError && (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-950">
                  {chatError}
                </p>
              )}
            </div>
          )}

          {user && listing.author_id === user.id && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleBoost}
                disabled={boosting}
                className="rounded-xl border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20 active:scale-[0.98] disabled:opacity-50"
              >
                {boosting
                  ? 'Поднимаем…'
                  : listing.promoted_until && new Date(listing.promoted_until) > new Date()
                    ? 'Продлить продвижение'
                    : 'Поднять объявление'}
              </button>
              {boostError && (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-950">
                  {boostError}
                </p>
              )}
            </div>
          )}

          <ReportButton targetType="listing" targetId={listing.id} />
        </div>
      )}
    </section>
  )
}
