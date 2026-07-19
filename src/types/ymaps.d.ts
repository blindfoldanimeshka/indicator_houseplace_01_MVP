export {}

declare global {
  interface Ymaps3Marker {
    new (options: { coordinates: [number, number] }, content: HTMLElement): unknown
  }

  interface Ymaps3Map {
    new (
      container: HTMLElement,
      options: {
        location: { center: [number, number]; zoom: number }
        behaviors?: string[]
      },
    ): Ymaps3MapInstance
    addChild: (child: unknown) => void
    on: (event: 'click', handler: (e: { location: Array<[number, number]> }) => void) => void
    destroy: () => void
  }

  interface Ymaps3MapInstance {
    addChild: (child: unknown) => void
    on: (event: 'click', handler: (e: { location: Array<[number, number]> }) => void) => void
    destroy: () => void
  }

  interface Ymaps3Module {
    ready: Promise<void> | void
    YMap: Ymaps3Map
    YMapMarker: Ymaps3Marker
  }

  interface Window {
    ymaps3?: Ymaps3Module
  }
}
