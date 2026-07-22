interface PaginationProps {
  /** Zero-based current page. */
  page: number
  /** Total number of pages. */
  totalPages: number
  /** Called with the new zero-based page. */
  onPageChange: (page: number) => void
  /** Optional total result count, shown as "Всего: N". */
  total?: number
  /** How many page buttons to show on each side of the current page. */
  siblingCount?: number
}

const DOTS = 'dots' as const

function buildRange(current: number, total: number, sibling: number): (number | typeof DOTS)[] {
  // Always show: first, last, current +- sibling, plus dots when gaps exist.
  const totalNumbers = sibling * 2 + 5 // first, last, current, 2 siblings each side

  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i)
  }

  const left = Math.max(current - sibling, 1)
  const right = Math.min(current + sibling, total - 2)
  const showLeftDots = left > 1
  const showRightDots = right < total - 2

  const range: (number | typeof DOTS)[] = [0]

  if (showLeftDots) {
    range.push(DOTS)
  } else {
    for (let i = 1; i < left; i++) range.push(i)
  }

  for (let i = left; i <= right; i++) range.push(i)

  if (showRightDots) {
    range.push(DOTS)
  } else {
    for (let i = right + 1; i < total - 1; i++) range.push(i)
  }

  range.push(total - 1)
  return range
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), totalPages - 1)
    if (clamped !== page) onPageChange(clamped)
  }

  const items = buildRange(page, totalPages, siblingCount)
  const baseBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-all duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40'

  const pageBtn = (p: number) =>
    p === page
      ? `${baseBtn} bg-primary text-white shadow-[var(--shadow-glow)]`
      : `${baseBtn} bg-surface text-foreground hover:border-primary/50 hover:text-primary`

  const arrowBtn =
    'inline-flex h-9 items-center gap-1 rounded-xl bg-surface px-3 text-sm font-medium text-foreground transition-all duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav
      aria-label="Пагинация"
      data-cursor-ignore
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {total !== undefined && (
        <span className="mr-1 text-sm text-muted-foreground">Всего: {total}</span>
      )}

      <button
        type="button"
        className={arrowBtn}
        onClick={() => go(page - 1)}
        disabled={page <= 0}
        aria-label="Предыдущая страница"
      >
        ←
      </button>

      {items.map((item, i) =>
        item === DOTS ? (
          <span
            key={`dots-${i}`}
            aria-hidden
            className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            type="button"
            key={item}
            className={pageBtn(item)}
            onClick={() => go(item)}
            aria-label={`Страница ${item + 1}`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item + 1}
          </button>
        ),
      )}

      <button
        type="button"
        className={arrowBtn}
        onClick={() => go(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Следующая страница"
      >
        →
      </button>
    </nav>
  )
}
