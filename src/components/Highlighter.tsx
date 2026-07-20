import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface HighlighterProps {
  children: ReactNode
  /** "underline" draws an animated stroke beneath the text.
   *  "highlight" paints a marker sweep behind the text. */
  action?: 'underline' | 'highlight'
  /** Accent color for the stroke/fill. */
  color?: string
  className?: string
}

/**
 * Lightweight stand-in for magicui's Highlighter, built on motion/react
 * (no extra registry deps). Reveals on scroll into view.
 */
export function Highlighter({
  children,
  action = 'highlight',
  color = '#C6FF33',
  className,
}: HighlighterProps) {
  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <span className="relative z-10">{children}</span>

      {action === 'underline' ? (
        <motion.svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[0.35em] w-full"
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <motion.path
            d="M0 6 Q 50 1 100 6"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.15 }}
          />
        </motion.svg>
      ) : (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[0.1em] z-0 block h-[0.7em] w-full rounded-[3px]"
          style={{ transformOrigin: 'left center', backgroundColor: color }}
          initial={{ scaleX: 0, opacity: 0.85 }}
          animate={{ scaleX: 1, opacity: 0.35 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.2 }}
        />
      )}
    </span>
  )
}
