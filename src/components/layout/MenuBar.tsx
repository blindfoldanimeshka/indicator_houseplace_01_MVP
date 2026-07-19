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
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = React.useState({ left: 0, width: 0 })

  React.useEffect(() => {
    if (activeIndex !== null && menuRef.current && tooltipRef.current) {
      const menuItem = menuRef.current.children[activeIndex] as HTMLElement
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
  }, [activeIndex])

  return (
    <div className={cn('relative', className)} {...props}>
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={springConfig}
            className="pointer-events-none absolute -top-[34px] left-0 right-0 z-50 flex justify-center"
          >
            <motion.div
              ref={tooltipRef}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-stone-200 bg-white/95 px-3 shadow-sm backdrop-blur"
              initial={{ x: tooltip.left }}
              animate={{ x: tooltip.left }}
              transition={springConfig}
            >
              <span className="whitespace-nowrap text-[13px] font-medium leading-tight text-stone-800">
                {items[activeIndex].label}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={menuRef}
        className={cn(
          'inline-flex items-center justify-center gap-[3px] overflow-hidden rounded-full border border-stone-200 bg-white/95 px-1.5 py-1 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_16px_-4px_rgba(0,0,0,0.12)] backdrop-blur',
        )}
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              item.active
                ? 'bg-teal-800 text-white'
                : 'text-stone-600 hover:bg-stone-100',
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </div>
    </div>
  )
}
