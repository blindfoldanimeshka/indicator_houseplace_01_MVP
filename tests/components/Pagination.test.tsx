import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Pagination } from '@/components/Pagination'

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(
      <Pagination page={0} totalPages={1} onPageChange={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders page numbers and arrows, marks the active page', () => {
    render(
      <Pagination page={0} totalPages={3} total={25} onPageChange={() => {}} />,
    )
    expect(screen.getByText('Всего: 25')).toBeTruthy()
    expect(screen.getByLabelText('Страница 1').getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByLabelText('Страница 2')).toBeTruthy()
    expect(screen.getByLabelText('Страница 3')).toBeTruthy()
  })

  it('calls onPageChange with the zero-based page on click', () => {
    const onChange = vi.fn()
    render(<Pagination page={0} totalPages={3} onPageChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Страница 3'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('disables the previous arrow on the first page and next on the last', () => {
    const { rerender } = render(
      <Pagination page={0} totalPages={3} onPageChange={() => {}} />,
    )
    expect(
      (screen.getByLabelText('Предыдущая страница') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByLabelText('Следующая страница') as HTMLButtonElement).disabled,
    ).toBe(false)

    rerender(<Pagination page={2} totalPages={3} onPageChange={() => {}} />)
    expect(
      (screen.getByLabelText('Предыдущая страница') as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(
      (screen.getByLabelText('Следующая страница') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('shows ellipsis for a large number of pages', () => {
    render(<Pagination page={5} totalPages={20} onPageChange={() => {}} />)
    // 20 pages > window, so at least one ellipsis separator should appear
    expect(screen.getAllByText('…').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Страница 1')).toBeTruthy()
    expect(screen.getByLabelText('Страница 20')).toBeTruthy()
    expect(screen.getByLabelText('Страница 6').getAttribute('aria-current')).toBe(
      'page',
    )
  })
})
