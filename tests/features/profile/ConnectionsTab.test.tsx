import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConnectionsTab } from '@/features/profile/components/ConnectionsTab'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useConnections as _useConnections } from '@/features/profile/useConnections'

const baseConnections = [
  { id: 'google', name: 'Google Account', connected: true },
  { id: 'apple', name: 'Apple ID', connected: false },
  { id: 'yandex', name: 'Яндекс', connected: false },
  { id: 'vk', name: 'VK', connected: false },
  { id: 'telegram', name: 'Telegram', connected: false },
]

let currentReturn: Record<string, unknown> = {}

vi.mock('@/features/profile/useConnections', () => ({
  useConnections: () => currentReturn as never,
  CONNECTION_PROVIDERS: [
    { id: 'google', name: 'Google Account', native: true },
    { id: 'apple', name: 'Apple ID', native: true },
    { id: 'yandex', name: 'Яндекс', native: true },
    { id: 'vk', name: 'VK', native: true },
    { id: 'telegram', name: 'Telegram', native: false },
  ],
}))

describe('ConnectionsTab', () => {
  it('renders the heading and service names', () => {
    currentReturn = {
      connections: baseConnections,
      loading: false,
      connecting: null,
      error: null,
      refresh: vi.fn(),
      link: vi.fn(),
      unlink: vi.fn(),
    }
    render(<ConnectionsTab />)
    expect(screen.getByText(/подключённые сервисы/i)).toBeInTheDocument()
    expect(screen.getByText(/google account/i)).toBeInTheDocument()
    expect(screen.getByText(/apple id/i)).toBeInTheDocument()
    expect(screen.getByText(/яндекс/i)).toBeInTheDocument()
    expect(screen.getByText(/vk/i)).toBeInTheDocument()
  })

  it('shows connect buttons for not-connected services and an unlink for connected', () => {
    currentReturn = {
      connections: baseConnections,
      loading: false,
      connecting: null,
      error: null,
      refresh: vi.fn(),
      link: vi.fn(),
      unlink: vi.fn(),
    }
    render(<ConnectionsTab />)
    const connectButtons = screen.getAllByRole('button', { name: /подключить/i })
    expect(connectButtons.length).toBe(3)
    expect(
      screen.getByRole('button', { name: /отвязать/i }),
    ).toBeInTheDocument()
  })

  it('calls unlink when the unlink button is clicked and confirmed', () => {
    const unlink = vi.fn()
    currentReturn = {
      connections: baseConnections,
      loading: false,
      connecting: null,
      error: null,
      refresh: vi.fn(),
      link: vi.fn(),
      unlink,
    }
    render(<ConnectionsTab />)

    fireEvent.click(screen.getByRole('button', { name: /отвязать/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /отвязать/i }))

    expect(unlink).toHaveBeenCalledWith('google')
  })

  it('surfaces an error message', () => {
    currentReturn = {
      connections: baseConnections,
      loading: false,
      connecting: null,
      error: 'Что-то пошло не так',
      refresh: vi.fn(),
      link: vi.fn(),
      unlink: vi.fn(),
    }
    render(<ConnectionsTab />)
    expect(screen.getByRole('alert')).toHaveTextContent(/что-то пошло не так/i)
  })
})
