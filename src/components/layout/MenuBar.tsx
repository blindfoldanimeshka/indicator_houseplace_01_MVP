import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MenuBarItem {
  key: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  active?: boolean
}

interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MenuBarItem[]
  onSelect: (key: string) => void
}

const BASE_ICON = 44
const MAX_SCALE = 1.7
const MAGNET_RANGE = 140

function scaleForDistance(dist: number): number {
  if (dist >= MAGNET_RANGE) return 1
  const t = 1 - dist / MAGNET_RANGE
  return 1 + (MAX_SCALE - 1) * t * t
}

export function MenuBar({ items, className, onSelect, ...props }: MenuBarProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [cursorX, setCursorX] = React.useState<number | null>(null)
  const [tooltipLeft, setTooltipLeft] = React.useState(0)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const menu = menuRef.current
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    const x = e.clientX - rect.left
    setCursorX(x)

    let nearest = 0
    let nearestDist = Infinity
    Array.from(menu.children).forEach((child, i) => {
      const cr = (child as HTMLElement).getBoundingClientRect()
      const center = cr.left - rect.left + cr.width / 2
      const d = Math.abs(x - center)
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    })
    setHovered(nearest)
  }

  React.useEffect(() => {
    if (hovered === null || !menuRef.current) return
    const el = menuRef.current.children[hovered] as HTMLElement
    const rect = menuRef.current.getBoundingClientRect()
    const cr = el.getBoundingClientRect()
    const center = cr.left - rect.left + cr.width / 2
    const half = tooltipRef.current?.offsetWidth ?? 0
    setTooltipLeft(center - half / 2)
  }, [hovered, cursorX])

  return (
    <div className={cn('relative', className)} {...props}>
      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute -top-[46px] left-0 z-50 w-full"
          >
            <motion.div
              ref={tooltipRef}
              className="absolute top-0 inline-flex h-7 -translate-x-1/2 items-center justify-center rounded-lg border border-stone-200 bg-white/95 px-3 text-[13px] font-medium leading-tight text-stone-800 shadow-sm backdrop-blur"
              animate={{ left: tooltipLeft }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {items[hovered].label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={menuRef}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          setHovered(null)
          setCursorX(null)
        }}
        className={cn(
          'flex h-[72px] items-end justify-center gap-1 rounded-[28px] border border-stone-200/80 bg-white/80 px-3 pb-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_14px_32px_-8px_rgba(0,0,0,0.25)] backdrop-blur-md',
        )}
      >
        {items.map((item, index) => {
          let scale = 1
          let lift = 0
          if (cursorX !== null && hovered !== null) {
            const el = menuRef.current?.children[index] as HTMLElement | undefined
            if (el) {
              const rect = menuRef.current!.getBoundingClientRect()
              const cr = el.getBoundingClientRect()
              const center = cr.left - rect.left + cr.width / 2
              const dist = Math.abs(cursorX - center)
              scale = scaleForDistance(dist)
              if (index === hovered) lift = -10
            }
          }
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
              className="relative flex h-full items-end justify-center outline-none"
              style={{ width: BASE_ICON }}
            >
              <motion.span
                animate={{ scale, y: lift }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                className={cn(
                  'flex items-center justify-center rounded-2xl transition-colors',
                  item.active
                    ? 'bg-teal-800 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100',
                )}
                style={{ width: BASE_ICON, height: BASE_ICON }}
              >
                <item.icon className="h-[22px] w-[22px]" />
              </motion.span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
