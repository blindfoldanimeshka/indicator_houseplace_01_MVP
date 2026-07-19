import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}))

function fakeFile(name = 'pic.png', type = 'image/png', size = 1024) {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('AvatarUpload', () => {
  beforeEach(() => {
    uploadMock.mockReset()
    getPublicUrlMock.mockReset()
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://x/avatars/u1' } })
  })

  it('renders upload button and no preview by default', () => {
    render(<AvatarUpload userId="u1" onUploaded={vi.fn()} />)
    expect(screen.getByRole('button', { name: /загрузить фото/i })).toBeInTheDocument()
  })

  it('uploads selected file and reports the path', async () => {
    uploadMock.mockResolvedValue({ error: null })
    const onUploaded = vi.fn()

    render(<AvatarUpload userId="u1" onUploaded={onUploaded} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [fakeFile()] } })

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('avatars/u1'))
    expect(uploadMock).toHaveBeenCalledWith(
      'avatars/u1',
      expect.anything(),
      expect.objectContaining({ upsert: true }),
    )
  })

  it('rejects non-image files', async () => {
    const onUploaded = vi.fn()
    render(<AvatarUpload userId="u1" onUploaded={onUploaded} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [fakeFile('doc.txt', 'text/plain')] },
    })

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/изображение/i),
    )
    expect(uploadMock).not.toHaveBeenCalled()
    expect(onUploaded).not.toHaveBeenCalled()
  })

  it('shows upload error from storage', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'nope' } })
    render(<AvatarUpload userId="u1" onUploaded={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [fakeFile()] } })

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('nope'))
  })
})
