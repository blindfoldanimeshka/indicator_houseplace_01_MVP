import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('shows the product name', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Аренда жилья напрямую.' })).toBeInTheDocument()
  })
})

