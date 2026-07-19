import { useState } from 'react'
import { ConnectedService } from '@/features/profile/components/ConnectedService'
import { TelegramConnect } from '@/features/profile/components/TelegramConnect'
import { ConfirmDialog } from '@/features/profile/components/ConfirmDialog'
import {
  useConnections,
  type ConnectionProvider,
} from '@/features/profile/useConnections'

export function ConnectionsTab() {
  const {
    connections,
    loading,
    connecting,
    error,
    link,
    unlink,
    refresh,
  } = useConnections()
  const [unlinkTarget, setUnlinkTarget] = useState<ConnectionProvider | null>(
    null,
  )
  const [telegramError, setTelegramError] = useState<string | null>(null)

  function handleConnect(id: ConnectionProvider) {
    if (id === 'telegram') return // handled by TelegramConnect widget
    void link(id)
  }

  function confirmUnlink() {
    if (unlinkTarget) void unlink(unlinkTarget)
    setUnlinkTarget(null)
  }

  return (
    <div data-testid="connections-tab" className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-teal-800">
        Подключённые сервисы
      </h2>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-stone-600">Загрузка…</p>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          {connections
            .filter((service) => service.id !== 'telegram')
            .map((service) => (
              <ConnectedService
                key={service.id}
                service={service}
                onConnect={handleConnect}
                onUnlink={setUnlinkTarget}
              />
            ))}
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-medium text-stone-800">Telegram</h3>
        {telegramError && (
          <p
            role="alert"
            className="mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            {telegramError}
          </p>
        )}
        {connections.find((service) => service.id === 'telegram')?.connected ? (
          <ConnectedService
            service={connections.find((service) => service.id === 'telegram')!}
            onConnect={handleConnect}
            onUnlink={setUnlinkTarget}
          />
        ) : (
          <TelegramConnect
            onConnected={() => void refresh()}
            onError={setTelegramError}
          />
        )}
      </div>

      {connecting && (
        <p className="mt-4 text-sm text-stone-500" aria-live="polite">
          Перенаправление в {connecting}…
        </p>
      )}

      <ConfirmDialog
        isOpen={unlinkTarget !== null}
        title="Отвязать сервис"
        message="Вы уверены, что хотите отвязать этот сервис от аккаунта?"
        confirmLabel="Отвязать"
        onClose={() => setUnlinkTarget(null)}
        onConfirm={confirmUnlink}
      />
    </div>
  )
}
