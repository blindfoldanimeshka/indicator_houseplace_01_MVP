import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export interface MenuBarItem {
  key: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  active?: boolean
  badge?: number
}

interface MenuBarProps {
  items: MenuBarItem[]
  onSelect?: (key: string) => void
  compact?: boolean
  className?: string
}

const BASE_ICON_BTN = 52
// Bar height = icon + equal vertical padding (pt-3 + pb-3 = 24px) so the dock
// grows/shrinks symmetrically top-to-bottom, never lopsided. Labels are hidden
// (icon-only dock), so no label row is reserved.
const BAR_PADDING = 12
const BASE_BAR_HEIGHT = BASE_ICON_BTN + BAR_PADDING * 2
const MAX_SCALE = 1.35
const MAGNET_RANGE = 120
// Compact state is a single proportional scale of the whole dock, so the panel
// and every icon shrink/grow together and stay symmetric top-to-bottom.
const COMPACT_SCALE = 0.78

const SPRING = { type: 'spring', stiffness: 320, damping: 26 } as const

function scaleForDistance(dist: number): number {
  if (dist >= MAGNET_RANGE) return 1
  const t = 1 - dist / MAGNET_RANGE
  return 1 + (MAX_SCALE - 1) * t * t
}

export function MenuBar({
  items,
  className,
  onSelect = () => {},
  compact = false,
}: MenuBarProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [cursorX, setCursorX] = React.useState<number | null>(null)
  const [tooltipLeft, setTooltipLeft] = React.useState(0)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  // Per-icon geometry in the menu's local coordinate space (for the liquid dock).
  const [centers, setCenters] = React.useState<number[]>([])

  const measure = React.useCallback(() => {
    const menu = menuRef.current
    if (!menu) return
    // Use layout coordinates (offsetLeft/Width) so CSS transforms (the compact
    // scale) don't skew the per-icon centers used for the magnet effect.
    const next = Array.from(menu.children).map((child) => {
      const el = child as HTMLElement
      return el.offsetLeft + el.offsetWidth / 2
    })
    setCenters(next)
  }, [])

  React.useEffect(() => {
    measure()
  }, [measure, items.length])

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

  // Single source of truth for the whole-dock scale. The panel and every icon
  // share this exact value as their base, so expanding/collapsing the dock is
  // perfectly proportional — no independent snapping between panel and icons.
  const dockScale = compact && hovered === null ? COMPACT_SCALE : 1

  // Liquid-dock scaling: every icon bulges by distance to the cursor. The result
  // is the union of the dock factor and the magnet factor, so a single scale
  // value drives the whole dock proportionally (no per-icon size jumps).
  function scaleForIndex(index: number): { scale: number; lift: number } {
    if (cursorX === null || hovered === null || centers.length === 0) {
      return { scale: dockScale, lift: 0 }
    }
    const center = centers[index] ?? 0
    const dist = Math.abs(cursorX - center)
    const magnet = scaleForDistance(dist)
    // Lift is proportional to how much this icon is magnified, so neighbors rise
    // smoothly instead of the focused icon jumping on its own.
    const lift = (magnet - 1) * 18
    return { scale: dockScale * magnet, lift }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn('relative', className)}
    >
      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute -top-[40px] left-0 z-50 w-full"
          >
            <motion.div
              ref={tooltipRef}
              className="absolute top-0 inline-flex h-6 -translate-x-1/2 items-center justify-center rounded-md bg-surface/95 px-2.5 text-xs font-medium leading-tight text-foreground shadow-sm backdrop-blur"
              animate={{ left: tooltipLeft }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {items[hovered].label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={menuRef}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          setHovered(null)
          setCursorX(null)
        }}
        className={cn(
          'flex origin-bottom items-center justify-center gap-2 rounded-[28px] bg-surface/80 px-3 pt-3 pb-3 shadow-[var(--shadow-float)] backdrop-blur-xl',
        )}
        style={{ height: BASE_BAR_HEIGHT }}
        animate={{ scale: dockScale }}
        transition={SPRING}
      >
        {items.map((item, index) => {
          const { scale, lift } = scaleForIndex(index)
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
              className="group relative flex origin-bottom flex-col items-center outline-none cursor-pointer"
              style={{ width: BASE_ICON_BTN }}
            >
              <motion.span
                animate={{ scale, y: lift }}
                transition={SPRING}
                className={cn(
                  'relative flex items-center justify-center rounded-[16px] transition duration-[var(--duration-base)] ease-[var(--ease-smooth)]',
                  item.active
                    ? 'bg-primary text-white shadow-[var(--shadow-glow)]'
                    : 'text-muted-foreground hover:bg-muted/60',
                )}
                style={{ width: BASE_ICON_BTN, height: BASE_ICON_BTN }}
              >
                <item.icon
                  size={22}
                  className="h-[22px] w-[22px]"
                />
                {item.badge ? (
                  <span className="absolute right-0 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-bold leading-none text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </motion.span>
            </button>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
