import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConnectionsTab } from '@/features/profile/components/ConnectionsTab'

describe('ConnectionsTab', () => {
  it('renders the heading and service names', () => {
    render(<ConnectionsTab />)

    expect(screen.getByText(/подключённые сервисы/i)).toBeInTheDocument()
    expect(screen.getByText(/google account/i)).toBeInTheDocument()
    expect(screen.getByText(/apple id/i)).toBeInTheDocument()
  })

  it('shows a connect button for not-connected services', () => {
    render(<ConnectionsTab />)

    const connectButtons = screen.getAllByRole('button', { name: /подключить/i })
    expect(connectButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('flips status to connected when the connect button is clicked', () => {
    render(<ConnectionsTab />)

    const appleRow = screen.getByText(/apple id/i).closest('[data-testid="service-row"]')
    expect(appleRow).toHaveTextContent(/не подключено/i)

    fireEvent.click(appleRow!.querySelector('button')!)

    expect(appleRow).toHaveTextContent(/подключено/i)
  })
})
