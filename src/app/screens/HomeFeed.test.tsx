import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NavigationProvider, useNav } from '@/app/navigation/NavigationProvider'
import { HomeFeed } from './HomeFeed'
import type { useUnreadCounts } from '@/features/chat/useUnreadCounts'

const listListings = vi.fn()
const recordListingView = vi.fn()

vi.mock('@/features/listings/api', () => ({
  listListings: (...args: unknown[]) => listListings(...args),
  recordListingView: (...args: unknown[]) => recordListingView(...args),
}))

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
  is_mock: true,
}

const unreadStub: ReturnType<typeof useUnreadCounts> = {
  total: 0,
  byChat: {},
  recent: [],
  markChatRead: vi.fn(),
  setMyChats: vi.fn(),
}

function Harness() {
  const nav = useNav()
  return (
    <>
      <button type="button" onClick={() => nav.push('detail', { listingId: 'x' })}>
        go-detail
      </button>
      <button type="button" onClick={() => nav.back()}>
        go-back
      </button>
      <HomeFeed
        onOpen={() => {}}
        userEmailConfirmed
        isSupabaseConfigured
        showNotifications={false}
        unread={unreadStub}
        onOpenChat={() => {}}
        onCloseNotifications={() => {}}
      />
    </>
  )
}

describe('HomeFeed nav persistence', () => {
  beforeEach(() => {
    listListings.mockReset()
    recordListingView.mockReset()
    listListings.mockResolvedValue({ data: [listing], error: null, count: 1 })
  })

  it('keeps feed filters after navigating away and back', async () => {
    render(
      <NavigationProvider>
        <Harness />
      </NavigationProvider>,
    )

    const cityInput = await screen.findByPlaceholderText('Например, Москва')
    fireEvent.change(cityInput, { target: { value: 'Питер' } })

    await waitFor(() =>
      expect((screen.getByPlaceholderText('Например, Москва') as HTMLInputElement).value).toBe(
        'Питер',
      ),
    )

    fireEvent.click(screen.getByText('go-detail'))
    fireEvent.click(screen.getByText('go-back'))

    await waitFor(() =>
      expect((screen.getByPlaceholderText('Например, Москва') as HTMLInputElement).value).toBe(
        'Питер',
      ),
    )
  })
})
