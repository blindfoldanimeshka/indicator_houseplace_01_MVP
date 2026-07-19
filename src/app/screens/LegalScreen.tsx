import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy'
import { TermsOfService } from '@/features/legal/TermsOfService'

type DocType = 'privacy' | 'terms'

interface LegalScreenProps {
  doc: DocType
  onBack: () => void
}

export function LegalScreen({ doc, onBack }: LegalScreenProps) {
  if (doc === 'privacy') {
    return <PrivacyPolicy onBack={onBack} />
  }
  return <TermsOfService onBack={onBack} />
}