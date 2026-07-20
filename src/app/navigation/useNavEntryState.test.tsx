import { act, render, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavigationProvider, useNav } from './NavigationProvider'
import { useNavEntryState } from './useNavEntryState'

function Probe() {
  const [filters, setFilters] = useNavEntryState<{ city: string }>(
    'feedFilters',
    {},
  )
  const { push, back } = useNav()
  return (
    <div>
      <span data-testid="city">{filters.city ?? ''}</span>
      <button data-testid="set" onClick={() => setFilters({ city: 'Москва' })}>
        set
      </button>
      <button data-testid="open" onClick={() => push('detail', { listingId: 'x' })}>
        open
      </button>
      <button data-testid="back" onClick={back}>
        back
      </button>
    </div>
  )
}

describe('useNavEntryState', () => {
  it('retains entry state across push/back (remount of same entry)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NavigationProvider>{children}</NavigationProvider>
    )
    const { result: r1 } = renderHook(() => useNavEntryState('feedFilters', {}), {
      wrapper,
    })
    act(() => r1.current[1]({ city: 'Москва' }))
    expect(r1.current[0]).toEqual({ city: 'Москва' })

    const { getByTestId } = render(
      <NavigationProvider>
        <Probe />
      </NavigationProvider>,
    )
    act(() => getByTestId('set').click())
    act(() => getByTestId('open').click())
    act(() => getByTestId('back').click())
    expect(getByTestId('city').textContent).toBe('Москва')
  })
})
