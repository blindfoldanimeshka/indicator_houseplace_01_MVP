import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

interface MorphHeadingProps {
  text: string
  className?: string
  /** Semantic heading level. Defaults to h1 (detail-screen title). */
  as?: HeadingTag
}

/**
 * One-shot morph-style entry for a heading: blurs + rises + fades in on mount,
 * evoking magicui's MorphingText feel without the looping phrase cycler or
 * the framer-motion registry dep. Replaces the plain opacity+y PageTransition
 * pop on the listing detail title. Honors reduced-motion (blur/y dropped).
 */
export function MorphHeading({ text, className, as = 'h1' }: MorphHeadingProps) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as] as typeof motion.h1

  const initial = reduced
    ? { opacity: 0 }
    : { opacity: 0, y: 16, filter: 'blur(10px)' }
  const animate = reduced
    ? { opacity: 1 }
    : { opacity: 1, y: 0, filter: 'blur(0px)' }

  return (
    <MotionTag
      aria-label={text}
      className={cn(className)}
      initial={initial}
      animate={animate}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {text as ReactNode}
    </MotionTag>
  )
}
