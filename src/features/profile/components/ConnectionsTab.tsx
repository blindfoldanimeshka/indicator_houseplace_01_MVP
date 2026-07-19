import { useState } from 'react'
import { ConnectedService } from '@/features/profile/components/ConnectedService'
import type { ConnectedService as ConnectedServiceType } from '@/features/profile/types/profile.types'

const INITIAL_SERVICES: ConnectedServiceType[] = [
  { id: 'google', name: 'Google Account', status: 'connected' },
  { id: 'apple', name: 'Apple ID', status: 'not_connected' },
  { id: 'github', name: 'GitHub', status: 'not_connected' },
]

export function ConnectionsTab() {
  const [services, setServices] = useState<ConnectedServiceType[]>(INITIAL_SERVICES)

  const handleConnect = (id: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === id ? { ...service, status: 'connected' } : service,
      ),
    )
  }

  return (
    <div data-testid="connections-tab" className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-teal-800">
        Подключённые сервисы
      </h2>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        {services.map((service) => (
          <ConnectedService
            key={service.id}
            service={service}
            onConnect={handleConnect}
          />
        ))}
      </div>
    </div>
  )
}
