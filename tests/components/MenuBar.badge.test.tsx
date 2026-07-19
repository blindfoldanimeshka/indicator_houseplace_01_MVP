import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MenuBar, type MenuBarItem } from '@/components/layout/MenuBar'
import { MessageSquare } from 'lucide-react'

describe('MenuBar badge', () => {
  it('renders a badge with the unread count', () => {
    const items: MenuBarItem[] = [
      { key: 'home', label: 'Поиск', icon: MessageSquare },
      { key: 'chats', label: 'Чаты', icon: MessageSquare, badge: 3 },
    ]
    render(<MenuBar items={items} onSelect={vi.fn()} />)

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders "99+" when the count exceeds 99', () => {
    const items: MenuBarItem[] = [
      { key: 'chats', label: 'Чаты', icon: MessageSquare, badge: 150 },
    ]
    render(<MenuBar items={items} onSelect={vi.fn()} />)

    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('shows no badge when count is zero/undefined', () => {
    const items: MenuBarItem[] = [
      { key: 'chats', label: 'Чаты', icon: MessageSquare },
    ]
    const { container } = render(<MenuBar items={items} onSelect={vi.fn()} />)

    expect(container.querySelector('.bg-red-600')).toBeNull()
  })
})
