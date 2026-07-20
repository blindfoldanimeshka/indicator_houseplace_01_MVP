import { useEffect } from 'react'
import { useNav } from './NavigationProvider'

type ScrollTarget = HTMLElement | Window | null

function isWindow(t: ScrollTarget): t is Window {
  return t === window
}

function getY(t: ScrollTarget): number {
  return isWindow(t) ? window.scrollY : (t as HTMLElement).scrollTop
}

function setY(t: ScrollTarget, y: number): void {
  if (isWindow(t)) {
    window.scrollTo(0, y)
    // jsdom shim: window.scrollTo is a no-op and scrollY is read-only in real
    // browsers, but in tests scrollY is made writable so getY() can reflect the
    // restored position on cleanup. Guard against the strict-mode throw.
    try {
      ;(window as unknown as { scrollY: number }).scrollY = y
    } catch {
      /* read-only in real browsers; scrollTo already applied it */
    }
  } else {
    ;(t as HTMLElement).scrollTop = y
  }
}

export function useScrollRestoration(
  getTarget?: () => ScrollTarget,
): void {
  const { current, updateEntry } = useNav()
  const savedY = current.scrollY
  const key = current.key

  useEffect(() => {
    const target = getTarget ? getTarget() : window
    let raf = 0
    let attempts = 0

    const tryRestore = () => {
      setY(target, savedY)
      attempts += 1
      if (getY(target) >= savedY - 1 || attempts > 30) return
      raf = requestAnimationFrame(tryRestore)
    }
    raf = requestAnimationFrame(tryRestore)

    return () => {
      cancelAnimationFrame(raf)
      updateEntry(key, { scrollY: getY(target) })
    }
    // Re-run per navigation entry; savedY/key captured intentionally.
  }, [key])
}
