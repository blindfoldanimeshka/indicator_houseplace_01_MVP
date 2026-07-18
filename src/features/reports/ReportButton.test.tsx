import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReportApiResult } from './reportApi'

const createReportMock = vi.fn()

function mockDeps(result: ReportApiResult<{ id: string }>) {
  createReportMock.mockReset()
  createReportMock.mockResolvedValue(result)

  vi.doMock('./reportApi', () => ({
    createReport: createReportMock,
  }))

  vi.doMock('@/features/auth/useAuth', () => ({
    useAuth: () => ({ user: { id: 'me' }, session: null }),
  }))
}

async function renderButton() {
  const { ReportButton } = await import('./ReportButton')
  return render(<ReportButton targetType="listing" targetId="l1" />)
}

describe('ReportButton', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('clicking "Пожаловаться" reveals the form', async () => {
    mockDeps({ data: { id: 'r1' }, error: null })
    await renderButton()

    expect(screen.queryByRole('button', { name: 'Отправить' })).toBeNull()
    fireEvent.click(screen.getByText('Пожаловаться'))

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeTruthy()
    expect(screen.getByRole('combobox')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Необязательно/)).toBeTruthy()
  })

  it('submitting valid input calls createReport with reporterId/targetType/targetId', async () => {
    mockDeps({ data: { id: 'r1' }, error: null })
    await renderButton()

    fireEvent.click(screen.getByText('Пожаловаться'))
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => expect(createReportMock).toHaveBeenCalledTimes(1))
    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'listing',
        targetId: 'l1',
        category: 'Спам',
      }),
      'me',
    )
  })

  it('submitting with empty category does not call createReport', async () => {
    mockDeps({ data: { id: 'r1' }, error: null })
    await renderButton()

    fireEvent.click(screen.getByText('Пожаловаться'))

    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '' } })

    const submit = screen.getByRole('button', {
      name: 'Отправить',
    }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.click(submit)
    await waitFor(() => expect(createReportMock).not.toHaveBeenCalled())
  })

  it('successful submit shows "Жалоба отправлена"', async () => {
    mockDeps({ data: { id: 'r1' }, error: null })
    await renderButton()

    fireEvent.click(screen.getByText('Пожаловаться'))
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() =>
      expect(screen.getByText('Жалоба отправлена')).toBeTruthy(),
    )
  })

  it('already_reported result shows "Вы уже пожаловались на это."', async () => {
    mockDeps({ data: null, error: 'already_reported' })
    await renderButton()

    fireEvent.click(screen.getByText('Пожаловаться'))
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() =>
      expect(screen.getByText('Вы уже пожаловались на это.')).toBeTruthy(),
    )
  })
})
