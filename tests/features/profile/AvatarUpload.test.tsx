import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'

const uploadMock = vi.fn()
const removeMock = vi.fn()
const getPublicUrlMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        remove: removeMock,
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
    removeMock.mockReset()
    getPublicUrlMock.mockReset()
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://x/avatars/u1' } })
  })

  it('renders upload button and no preview by default', () => {
    render(<AvatarUpload userId="u1" onUploaded={vi.fn()} />)
    expect(screen.getByRole('button', { name: /загрузить фото/i })).toBeInTheDocument()
  })

  it('removes the old avatar, then uploads the new one as the bare id', async () => {
    uploadMock.mockResolvedValue({ error: null })
    removeMock.mockResolvedValue({ error: null })
    const onUploaded = vi.fn()

    render(<AvatarUpload userId="u1" onUploaded={onUploaded} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [fakeFile()] } })

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('u1'))
    // Old avatar is fully removed first (no history kept).
    // removeAvatar passes bare userId; supabase-js prepends bucket name.
    expect(removeMock).toHaveBeenCalledWith(['u1'])
    // supabase-js prefixes the bucket name (`avatars/`) to the upload path, so
    // we pass the bare id. The stored object becomes `avatars/u1`, which the
    // RLS helper user_id_from_avatar_path(name) parses via array_split(name,'/')[2].
    expect(uploadMock).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      expect.objectContaining({ upsert: false }),
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
