import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function png(): File {
  return new File(['x'], 'a.png', { type: 'image/png' })
}

describe('PhotoUploader', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('renders a file input and an empty placeholder when there are no photos', async () => {
    vi.doMock('@/features/photos/photoApi', () => ({
      listPhotos: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn((p: string) => 'https://cdn/' + p),
      removePhoto: vi.fn().mockResolvedValue({ data: true, error: null }),
      uploadPhoto: vi.fn().mockResolvedValue({ data: { id: '1', path: 'p' }, error: null }),
      MAX_PHOTOS: 10,
    }))

    const { PhotoUploader } = await import('./PhotoUploader')
    render(<PhotoUploader listingId="abc" />)

    const input = screen.getByLabelText(/добавить фото/i, { selector: 'input' })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'file')

    await waitFor(() => expect(screen.getByText(/пока нет фотографий/i)).toBeInTheDocument())
  })

  it('selecting a valid file calls uploadPhoto with the listingId', async () => {
    const uploadPhoto = vi.fn().mockResolvedValue({ data: { id: '1', path: 'p' }, error: null })
    vi.doMock('@/features/photos/photoApi', () => ({
      listPhotos: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn((p: string) => 'https://cdn/' + p),
      removePhoto: vi.fn().mockResolvedValue({ data: true, error: null }),
      uploadPhoto,
      MAX_PHOTOS: 10,
    }))

    const { PhotoUploader } = await import('./PhotoUploader')
    render(<PhotoUploader listingId="abc" />)

    const input = await screen.findByLabelText(/добавить фото/i, { selector: 'input' })
    fireEvent.change(input, { target: { files: [png()] } })

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(1))
    expect(uploadPhoto.mock.calls[0][0]).toBe('abc')
    expect(uploadPhoto.mock.calls[0][1]).toBeInstanceOf(File)
  })
})
