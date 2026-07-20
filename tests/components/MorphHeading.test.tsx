import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MorphHeading } from '@/components/MorphHeading'

describe('MorphHeading', () => {
  it('renders the heading text visibly', () => {
    render(<MorphHeading text="Москва" as="h1" className="font-display" />)
    expect(screen.getByText('Москва')).toBeInTheDocument()
  })

  it('exposes an accessible aria-label with the text', () => {
    render(<MorphHeading text="Казань" as="h1" />)
    expect(screen.getByLabelText('Казань')).toBeInTheDocument()
  })

  it('renders with the requested semantic tag', () => {
    const { container } = render(<MorphHeading text="Сочи" as="h2" />)
    expect(container.querySelector('h2')).not.toBeNull()
  })
})
