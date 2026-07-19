import type { ConnectionStatus } from '@/features/profile/useConnections'

interface ConnectedServiceProps {
  service: ConnectionStatus
  onConnect: (id: ConnectionStatus['id']) => void
  onUnlink: (id: ConnectionStatus['id']) => void
}

export function ConnectedService({ service, onConnect, onUnlink }: ConnectedServiceProps) {
  const isConnected = service.connected

  return (
    <div
      data-testid="service-row"
      className="flex items-center justify-between border-b border-stone-200 py-3 last:border-0"
    >
      <span className="text-stone-800">{service.name}</span>

      <div className="flex items-center gap-3">
        <span className={isConnected ? 'text-green-600' : 'text-stone-500'}>
          {isConnected ? 'Подключено' : 'Не подключено'}
        </span>

        {isConnected ? (
          <button
            type="button"
            onClick={() => onUnlink(service.id)}
            className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 transition hover:bg-red-50"
          >
            Отвязать
          </button>
        ) : (
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
