import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

/** Completely ignored by custom cursor */
const IGNORE_SELECTORS = [
  '.pagination',
  '[data-cursor-ignore]',
]

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false)
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)

  const springConfig = { damping: 30, stiffness: 500, mass: 0.6 }
  const smoothX = useSpring(cursorX, springConfig)
  const smoothY = useSpring(cursorY, springConfig)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '* { cursor: none !important; }'
    style.id = 'custom-cursor-style'
    document.head.appendChild(style)

    const onMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      for (const sel of IGNORE_SELECTORS) {
        if (target.closest(sel)) return
      }
      if (target.closest('button, a, input, select, textarea, [role="button"], [data-cursor]')) {
        setIsHovering(true)
      }
    }

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"], [data-cursor]')) {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout', onMouseOut)
      document.getElementById('custom-cursor-style')?.remove()
    }
  }, [cursorX, cursorY])

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
      style={{
        x: smoothX,
        y: smoothY,
        translateX: '-50%',
        translateY: '-50%',
      }}
      animate={{
        width: isHovering ? 40 : 12,
        height: isHovering ? 40 : 12,
        backgroundColor: isHovering
          ? 'rgba(125, 57, 235, 0.15)'
          : 'rgba(125, 57, 235, 0.9)',
        border: isHovering
          ? '2px solid rgba(125, 57, 235, 0.5)'
          : 'none',
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 400,
        mass: 0.6,
      }}
    />
  )
}
