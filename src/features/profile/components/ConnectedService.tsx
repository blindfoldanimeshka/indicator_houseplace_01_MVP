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
      className="flex items-center justify-between py-3 transition hover:bg-muted/40"
    >
      <span className="text-foreground">{service.name}</span>

      <div className="flex items-center gap-3">
        <span className={isConnected ? 'text-green-600' : 'text-muted-foreground'}>
          {isConnected ? 'Подключено' : 'Не подключено'}
        </span>

        {isConnected ? (
          <button
            type="button"
            onClick={() => onUnlink(service.id)}
            className="rounded-md px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-500/10"
          >
            Отвязать
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(service.id)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-white shadow-[var(--shadow-glow)] transition hover:brightness-110"
          >
            Подключить
          </button>
        )}
      </div>
    </div>
  )
}
