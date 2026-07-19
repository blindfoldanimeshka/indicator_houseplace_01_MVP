import { ListingDetail } from '@/features/listings/ListingDetail'

interface ListingDetailScreenProps {
  id: string
  onBack: () => void
  onStartChat: (chatId: string) => void
}

export function ListingDetailScreen({ id, onBack, onStartChat }: ListingDetailScreenProps) {
  return (
    <ListingDetail id={id} onBack={onBack} onStartChat={onStartChat} />
  )
}