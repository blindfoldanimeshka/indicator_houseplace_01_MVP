import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy'
import { TermsOfService } from '@/features/legal/TermsOfService'

describe('Legal pages', () => {
  it('PrivacyPolicy renders template warning and calls onBack', () => {
    const onBack = vi.fn()
    render(<PrivacyPolicy onBack={onBack} />)

    expect(
      screen.getByText(/Шаблон\. Требует юридической проверки перед публичным запуском \(152-ФЗ\)\./),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Политика конфиденциальности' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Назад' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('TermsOfService renders template warning and calls onBack', () => {
    const onBack = vi.fn()
    render(<TermsOfService onBack={onBack} />)

    expect(
      screen.getByText(/Шаблон\. Требует юридической проверки перед публичным запуском \(152-ФЗ\)\./),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Условия использования' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Назад' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
