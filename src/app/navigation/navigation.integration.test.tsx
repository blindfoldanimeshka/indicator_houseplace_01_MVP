import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NavigationProvider, useNav } from './NavigationProvider'
import { useNavEntryState } from './useNavEntryState'
import { useScrollRestoration } from './useScrollRestoration'

vi.mock('@/features/listings/api', () => ({
  listListings: () => Promise.resolve({ data: [], error: null, count: 0 }),
}))

function HomeScreen() {
  useScrollRestoration()
  const [filters, setFilters] = useNavEntryState<{ city: string }>('feedFilters', {})
  const { push } = useNav()
  return (
    <div>
      <span data-testid="city">{filters.city ?? ''}</span>
      <button data-testid="setCity" onClick={() => setFilters({ city: 'Казань' })}>
        set
      </button>
      <button data-testid="open" onClick={() => push('detail', { listingId: 'l1' })}>
        open
      </button>
    </div>
  )
}

function DetailScreen() {
  const { back } = useNav()
  return <button data-testid="back" onClick={back}>back</button>
}

function App() {
  const { current } = useNav()
  if (current.view === 'home') return <HomeScreen />
  if (current.view === 'detail') return <DetailScreen />
  return null
}

describe('navigation integration', () => {
  it('preserves feed filters and scroll across detail round-trip', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })

    render(
      <NavigationProvider>
        <App />
      </NavigationProvider>,
    )

    act(() => screen.getByTestId('setCity').click())
    expect(screen.getByTestId('city').textContent).toBe('Казань')

    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true })
    act(() => screen.getByTestId('open').click())
    expect(screen.queryByTestId('city')).toBeNull()

    act(() => screen.getByTestId('back').click())
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('Казань'))
    // Scroll restoration runs inside requestAnimationFrame; flush a frame first.
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 800)
  })
})
