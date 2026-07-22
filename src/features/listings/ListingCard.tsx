import type { Database } from '@/types/database'
import { ImageIcon } from 'lucide-react'
import { Highlighter } from '@/components/Highlighter'
import { ListingCardCarousel } from './ListingCardCarousel'

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
  photoUrls?: string[]
}

export function ListingCard({ listing, onOpen, photoUrls }: ListingCardProps) {
  const isOffer = listing.type === 'offer'

  return (
    <button
      type="button"
      onClick={() => onOpen(listing)}
      className="group flex flex-col overflow-hidden rounded-[8px] bg-surface text-left shadow-[var(--shadow-surface)] transition-all duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-raised)]"
    >
      {photoUrls && photoUrls.length > 0 ? (
        <ListingCardCarousel
          urls={photoUrls}
          alt={`Фото: ${listing.city}`}
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/40">
          <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}

      <div className="surface-elevated space-y-3 rounded-b-[8px] p-6">
      <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex w-fit items-center rounded-[8px] border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
          isOffer
            ? 'border-primary/30 bg-primary/20 text-primary'
            : 'border-secondary/30 bg-secondary/20 text-secondary'
        }`}
      >
        {isOffer ? 'Сдаётся' : 'Ищу'}
      </span>

      {listing.is_mock && (
        <span className="inline-flex w-fit items-center rounded-[8px] border border-primary/20 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
          MOCK
        </span>
      )}
      </div>

      <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
        <Highlighter action="underline" color="#7D39EB">
          {listing.city}
        </Highlighter>
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {ROOMS_LABELS[listing.rooms] ?? listing.rooms}
        {listing.area ? `, ${listing.area} м²` : ''}
      </p>

      <div className="my-3 h-px bg-border-muted" />

      <p className="font-display text-2xl font-semibold text-foreground">
        <Highlighter action="highlight" color="#C6FF33">
          {formatPrice(listing.price)} ₽
        </Highlighter>
        <span className="text-sm font-normal text-muted-foreground"> / мес.</span>
      </p>

      {listing.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {listing.description}
        </p>
      )}
      </div>
    </button>
  )
}
