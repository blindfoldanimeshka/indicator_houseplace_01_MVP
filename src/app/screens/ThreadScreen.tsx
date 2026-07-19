import { Thread } from '@/features/chat/Thread'

interface ThreadScreenProps {
  chatId: string
  onBack: () => void
}

export function ThreadScreen({ chatId, onBack }: ThreadScreenProps) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 text-sm font-medium text-primary hover:underline"
      >
        ← Назад
      </button>
      <Thread chatId={chatId} />
    </>
  )
}