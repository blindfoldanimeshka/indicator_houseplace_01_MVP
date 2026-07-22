import { useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoCarouselProps {
  urls: string[]
  alt: string
  onImageClick?: (index: number) => void
  className?: string
}

export function PhotoCarousel({ urls, alt, onImageClick, className = '' }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const count = urls.length

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? count - 1 : i - 1))
  }, [count])

  const next = useCallback(() => {
    setIndex((i) => (i === count - 1 ? 0 : i + 1))
  }, [count])

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev()
    }
    touchStart.current = null
  }

  function handleImageClick() {
    if (onImageClick) {
      onImageClick(index)
    }
  }

  if (count === 0) return null

  return (
    <div
      className={`group/carousel relative w-full overflow-hidden ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label="Фото объявления"
    >
      {/* Track */}
      <div
        className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {urls.map((url, i) => (
          <div
            key={url}
            className="h-full w-full flex-shrink-0"
            aria-hidden={i !== index}
          >
            <img
              src={url}
              alt={i === index ? alt : ''}
              loading={i === index ? 'eager' : 'lazy'}
              className={`h-full w-full object-cover ${onImageClick ? 'cursor-pointer' : ''}`}
              onClick={handleImageClick}
            />
          </div>
        ))}
      </div>

      {/* Gradient overlay — bottom 2/5 (taller for detail view) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Arrows — visible on hover (desktop) / always on touch */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); prev() }}
            aria-label="Предыдущее фото"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-black/60 group-hover/carousel:opacity-100 max-sm:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); next() }}
            aria-label="Следующее фото"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-black/60 group-hover/carousel:opacity-100 max-sm:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots — only if >1 photo */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIndex(i) }}
              aria-label={`Фото ${i + 1} из ${count}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === index ? 'w-5 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
