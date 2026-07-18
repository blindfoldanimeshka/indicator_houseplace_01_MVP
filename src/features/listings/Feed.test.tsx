import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listing = {
  id: 'l1',
  author_id: 'u1',
  type: 'offer',
  city: 'Москва',
  rooms: '1',
  price: 50000,
  area: 40,
  description: 'Светлая квартира',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
}

const listListings = vi.fn()

vi.mock('@/features/listings/api', () => ({
  listListings: (...args: unknown[]) => listListings(...args),
}))

describe('Feed', () => {
  beforeEach(() => {
    listListings.mockReset()
  })

  it('renders cards after loading when data is returned', async () => {
    listListings.mockResolvedValue({ data: [listing], error: null, count: 1 })

    const { Feed } = await import('./Feed')
    render(<Feed onOpen={() => {}} />)

    await waitFor(() => expect(screen.getByText('Москва')).toBeInTheDocument())
    expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument()
  })

  it('shows empty state when data is empty', async () => {
    listListings.mockResolvedValue({ data: [], error: null, count: 0 })

    const { Feed } = await import('./Feed')
    render(<Feed onOpen={() => {}} />)

    await waitFor(() =>
      expect(
        screen.getByText('Объявлений не найдено. Попробуйте изменить фильтры.'),
      ).toBeInTheDocument(),
    )
  })

  it('shows error state when error is returned', async () => {
    listListings.mockResolvedValue({ data: null, error: 'Упс, ошибка', count: null })

    const { Feed } = await import('./Feed')
    render(<Feed onOpen={() => {}} />)

    await waitFor(() => expect(screen.getByText('Упс, ошибка')).toBeInTheDocument())
  })
})
