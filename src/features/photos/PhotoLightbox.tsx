import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoLightboxProps {
  urls: string[]
  index: number
  open: boolean
  onClose: () => void
  onIndexChange: (index: number) => void
  alt?: string
}

export function PhotoLightbox({
  urls,
  index,
  open,
  onClose,
  onIndexChange,
  alt = 'Фото',
}: PhotoLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const count = urls.length

  // Focus trap: focus close button on open
  useEffect(() => {
    if (open) {
      closeRef.current?.focus()
    }
  }, [open])

  // Escape + arrow keys
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onIndexChange(index === 0 ? count - 1 : index - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onIndexChange(index === count - 1 ? 0 : index + 1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, index, count, onClose, onIndexChange])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function prev() {
    onIndexChange(index === 0 ? count - 1 : index - 1)
  }

  function next() {
    onIndexChange(index === count - 1 ? 0 : index + 1)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
        >
          {/* Close button */}
          <button
            ref={closeRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            aria-label="Закрыть"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter */}
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
            {index + 1} / {count}
          </div>

          {/* Prev arrow */}
          {count > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              aria-label="Предыдущее фото"
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Next arrow */}
          {count > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next() }}
              aria-label="Следующее фото"
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Image — stopPropagation prevents overlay close */}
          <motion.img
            key={urls[index]}
            src={urls[index]}
            alt={`${alt} ${index + 1} из ${count}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
