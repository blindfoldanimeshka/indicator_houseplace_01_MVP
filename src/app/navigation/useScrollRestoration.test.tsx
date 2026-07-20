import { act, render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NavigationProvider, useNav } from './NavigationProvider'
import { useScrollRestoration } from './useScrollRestoration'
import { initialStack, type StackState } from './stack'

function Screen() {
  useScrollRestoration()
  const { push, back } = useNav()
  return (
    <div>
      <button data-testid="open" onClick={() => push('detail', { listingId: 'x' })}>
        open
      </button>
      <button data-testid="back" onClick={back}>
        back
      </button>
    </div>
  )
}

describe('useScrollRestoration', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  })

  it('restores the saved scroll position when returning to an entry', async () => {
    const seeded: StackState = initialStack('home')
    seeded.entries[0] = { ...seeded.entries[0], scrollY: 500 }

    const { getByTestId } = render(
      <NavigationProvider initial={seeded}>
        <Screen />
      </NavigationProvider>,
    )
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    expect(window.scrollTo).toHaveBeenCalledWith(0, 500)

    act(() => getByTestId('open').click())
    act(() => getByTestId('back').click())
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 500)
  })
})
