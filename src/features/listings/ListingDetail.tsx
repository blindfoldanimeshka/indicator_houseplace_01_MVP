import { useEffect, useState } from 'react'
import { getListing, boostListing } from './api'
import { listPhotos, getPublicUrl } from '@/features/photos/photoApi'
import { getMockPhotoUrls } from './mockPhotos'
import { PhotoLightbox } from '@/features/photos/PhotoLightbox'
import { useAuth } from '@/features/auth/useAuth'
import { openOrCreateChat } from '@/features/chat/chatApi'
import { ReportButton } from '@/features/reports/ReportButton'
import { MapView } from './MapView'
import { PhotoCarousel } from './PhotoCarousel'
import { ImageIcon, ArrowUpRight } from 'lucide-react'
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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

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
      setPhotos(getMockPhotoUrls(0))
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
    <section className="max-w-5xl space-y-6">
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
        <>
          {/* Hero Frame */}
          <div className="relative overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-raised)]">
            {photos.length > 0 ? (
              <>
                <PhotoCarousel
                  urls={photos}
                  alt={`Фото: ${listing.city}`}
                  onImageClick={(i) => { setLightboxIndex(i); setLightboxOpen(true) }}
                  className="min-h-[50vh] sm:min-h-[55vh]"
                />

                {/* Dark overlay panel — overlapping bottom */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 sm:p-6">
                  <div className="pointer-events-auto rounded-2xl bg-black/70 p-4 backdrop-blur-md sm:p-5">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
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
                    </div>

                    {/* City + rooms/area */}
                    <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {listing.city}
                    </h1>
                    <p className="mt-1 text-sm text-white/80">
                      {ROOMS_LABELS[listing.rooms] ?? listing.rooms}
                      {listing.area ? `, ${listing.area} м²` : ''}
                    </p>

                    {/* Price */}
                    <p className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">
                      {formatPrice(listing.price)} ₽<span className="text-sm font-normal text-white/60">/мес.</span>
                    </p>

                    {/* Description — truncated in overlay */}
                    {listing.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-white/70">
                        {listing.description}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Placeholder when no photos */
              <div className="flex min-h-[40vh] items-center justify-center bg-muted/40">
                <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Stats: Rooms */}
            <div className="surface-elevated rounded-2xl bg-muted/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Комнаты</p>
              <p className="mt-1 font-display text-xl font-semibold text-foreground">
                {ROOMS_LABELS[listing.rooms] ?? listing.rooms}
              </p>
            </div>

            {/* Stats: Area */}
            {listing.area && (
              <div className="surface-elevated rounded-2xl bg-muted/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Площадь</p>
                <p className="mt-1 font-display text-xl font-semibold text-foreground">{listing.area} м²</p>
              </div>
            )}

            {/* Price Accent Tile */}
            <div className="rounded-2xl bg-secondary p-5 text-secondary-foreground">
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">Цена</p>
              <p className="mt-1 font-display text-2xl font-bold">
                {formatPrice(listing.price)} ₽<span className="text-sm font-normal opacity-80">/мес.</span>
              </p>
            </div>

            {/* Description — wide tile */}
            {listing.description && (
              <div className="surface-elevated rounded-2xl bg-surface p-5 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Описание</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Address */}
            {listing.address && (
              <div className="surface-elevated rounded-2xl bg-surface p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Адрес</p>
                <p className="mt-2 text-sm text-foreground">{listing.address}</p>
              </div>
            )}

            {/* Map */}
            {listing.lat !== null && listing.lng !== null && (
              <div className="overflow-hidden rounded-2xl sm:col-span-2 lg:col-span-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">На карте</p>
                <MapView lat={listing.lat} lng={listing.lng} address={listing.address} height={280} />
              </div>
            )}

            {/* CTA — primary accent */}
            {user && listing.author_id !== user.id && onStartChat && (
              <div className="flex flex-col justify-center rounded-2xl bg-primary p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">Действие</p>
                <button
                  type="button"
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/30 disabled:opacity-50"
                >
                  {chatLoading ? 'Открываем диалог…' : 'Написать автору'}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                {chatError && <p className="mt-2 text-sm text-red-300">{chatError}</p>}
              </div>
            )}

            {/* Owner: Boost */}
            {user && listing.author_id === user.id && (
              <div className="flex flex-col justify-center rounded-2xl border border-primary/30 bg-primary/10 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Действие</p>
                <button
                  type="button"
                  onClick={handleBoost}
                  disabled={boosting}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                >
                  {boosting
                    ? 'Поднимаем…'
                    : listing.promoted_until && new Date(listing.promoted_until) > new Date()
                      ? 'Продлить продвижение'
                      : 'Поднять объявление'}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                {boostError && <p className="mt-2 text-sm text-red-600">{boostError}</p>}
              </div>
            )}

            {/* Report — muted */}
            <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-5">
              <span className="text-sm text-muted-foreground">Что-то не так?</span>
              <ReportButton targetType="listing" targetId={listing.id} />
            </div>
          </div>

          <PhotoLightbox
            urls={photos}
            index={lightboxIndex}
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onIndexChange={setLightboxIndex}
            alt={`Фото: ${listing.city}`}
          />
        </>
      )}
    </section>
  )
}
