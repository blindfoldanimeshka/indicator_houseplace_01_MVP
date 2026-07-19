import type { ReactNode } from 'react'
import { ProfilePage } from './components/ProfilePage'

export { ProfilePage }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProfileScreen(_props: { onBack?: () => void }): ReactNode {
  return <ProfilePage />
}
