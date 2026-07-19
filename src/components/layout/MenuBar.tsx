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

const springConfig = {
  duration: 0.25,
  ease: 'easeInOut' as const,
}

export function MenuBar({ items, className, onSelect, ...props }: MenuBarProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [tooltip, setTooltip] = React.useState({ left: 0, width: 0 })
  const menuRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (hovered !== null && menuRef.current && tooltipRef.current) {
      const menuItem = menuRef.current.children[hovered] as HTMLElement
      const menuRect = menuRef.current.getBoundingClientRect()
      const itemRect = menuItem.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()

      const left =
        itemRect.left -
        menuRect.left +
        (itemRect.width - tooltipRect.width) / 2

      setTooltip({
        left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
        width: tooltipRect.width,
      })
    }
  }, [hovered])

  return (
    <div className={cn('relative', className)} {...props}>
      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={springConfig}
            className="pointer-events-none absolute -top-[42px] left-0 right-0 z-50 flex justify-center"
          >
            <motion.div
              ref={tooltipRef}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-stone-200 bg-white/95 px-3 shadow-sm backdrop-blur"
              initial={{ x: tooltip.left }}
              animate={{ x: tooltip.left }}
              transition={springConfig}
            >
              <span className="whitespace-nowrap text-[13px] font-medium leading-tight text-stone-800">
                {items[hovered].label}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={menuRef}
        className={cn(
          'inline-flex items-end justify-center gap-2 overflow-visible rounded-[26px] border border-stone-200/80 bg-white/80 px-3 pb-2 pt-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_12px_28px_-6px_rgba(0,0,0,0.22)] backdrop-blur-md',
        )}
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            className="relative flex items-end justify-center outline-none"
          >
            <motion.span
              animate={
                hovered === index
                  ? { scale: 1.45, y: -8 }
                  : { scale: 1, y: 0 }
              }
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-2xl transition-colors',
                item.active
                  ? 'bg-teal-800 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100',
              )}
            >
              <item.icon className="h-[22px] w-[22px]" />
            </motion.span>
          </button>
        ))}
      </div>
    </div>
  )
}
