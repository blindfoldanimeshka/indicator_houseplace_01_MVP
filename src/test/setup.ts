import '@testing-library/jest-dom/vitest'

// jsdom lacks IntersectionObserver, which motion/react (and scroll/whileInView
// hooks) expect. Provide a no-op stub so tests don't throw on import/render.
class MockIntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

if (!('IntersectionObserver' in globalThis)) {
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}


