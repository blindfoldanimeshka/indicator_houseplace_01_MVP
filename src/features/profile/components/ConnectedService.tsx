import type { ConnectedService } from '@/features/profile/types/profile.types'

interface ConnectedServiceProps {
  service: ConnectedService
  onConnect: (id: string) => void
}

export function ConnectedService({ service, onConnect }: ConnectedServiceProps) {
  const isConnected = service.status === 'connected'

  return (
    <div
      data-testid="service-row"
      className="flex items-center justify-between border-b border-stone-200 py-3 last:border-0"
    >
      <span className="text-stone-800">{service.name}</span>

      <div className="flex items-center gap-3">
        <span
          className={
            isConnected
              ? 'text-green-600'
              : 'text-stone-500'
          }
        >
          {isConnected ? 'Подключено' : 'Не подключено'}
        </span>

        {!isConnected && (
          <button
            type="button"
            onClick={() => onConnect(service.id)}
            className="rounded-md bg-teal-800 px-3 py-1 text-sm text-white hover:bg-teal-900"
          >
            Подключить
          </button>
        )}
      </div>
    </div>
  )
}
