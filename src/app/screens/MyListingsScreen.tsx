import { MyListings } from '@/features/listings/MyListings'

interface MyListingsScreenProps {
  onBack: () => void
}

export function MyListingsScreen({ onBack }: MyListingsScreenProps) {
  return <MyListings onBack={onBack} />
}