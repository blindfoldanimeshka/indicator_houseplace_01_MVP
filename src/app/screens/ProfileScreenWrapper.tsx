import { ProfilePage } from '@/features/profile/components/ProfilePage'

interface ProfileScreenWrapperProps {
  onBack: () => void
}

export function ProfileScreenWrapper({ onBack }: ProfileScreenWrapperProps) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Назад
      </button>
      <ProfilePage />
    </>
  )
}