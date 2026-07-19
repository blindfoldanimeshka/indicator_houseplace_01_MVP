import { ListingForm } from '@/features/listings/ListingForm'

interface NewListingProps {
  onSaved: () => void
  onCancel: () => void
}

export function NewListing({ onSaved, onCancel }: NewListingProps) {
  return (
    <ListingForm onSaved={onSaved} onCancel={onCancel} />
  )
}