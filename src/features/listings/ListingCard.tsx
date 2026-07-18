import type { Database } from '@/types/database'
import { getPublicUrl } from '@/features/photos/photoApi'

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

interface ListingCardProps {
  listing: ListingRow
  onOpen: (listing: ListingRow) => void
  coverPath?: string
}

export function ListingCard({ listing, onOpen, coverPath }: ListingCardProps) {
  const isOffer = listing.type === 'offer'

  return (
    <button
      type="button"
      onClick={() => onOpen(listing)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
    >
      {coverPath ? (
        <img
          src={getPublicUrl(coverPath)}
          alt={`Фото: ${listing.city}`}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full bg-stone-100" />
      )}

      <div className="space-y-3 p-5">
      <span
        className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
          isOffer
            ? 'bg-teal-100 text-teal-900'
            : 'bg-amber-100 text-amber-900'
        }`}
      >
        {isOffer ? 'Сдаётся' : 'Ищу'}
      </span>

      <h3 className="text-lg font-semibold tracking-tight text-stone-950">
        {listing.city}
      </h3>
      <p className="mt-1 text-sm text-stone-600">
        {ROOMS_LABELS[listing.rooms] ?? listing.rooms}
        {listing.area ? `, ${listing.area} м²` : ''}
      </p>

      <p className="mt-3 text-xl font-semibold text-stone-950">
        {formatPrice(listing.price)} ₽
        <span className="text-sm font-normal text-stone-500"> / мес.</span>
      </p>

      {listing.description && (
        <p className="mt-3 line-clamp-2 text-sm text-stone-600">
          {listing.description}
        </p>
      )}
      </div>
    </button>
  )
}
