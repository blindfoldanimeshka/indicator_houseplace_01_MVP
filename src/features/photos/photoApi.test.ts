import { beforeEach, describe, expect, it, vi } from 'vitest'

type DbResult = { data: unknown; error: { message: string } | null }

function makeDbChain(result: DbResult) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: DbResult) => void) => resolve(result)),
  }
  return chain
}

interface MockSupabase {
  storage: {
    from: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

let dbChain: ReturnType<typeof makeDbChain>
let uploadMock: ReturnType<typeof vi.fn>
let removeMock: ReturnType<typeof vi.fn>
let getPublicUrlMock: ReturnType<typeof vi.fn>

function mockSupabaseWithStorage(dbResult: DbResult) {
  dbChain = makeDbChain(dbResult)
  uploadMock = vi.fn().mockResolvedValue({ data: { path: 'p' }, error: null })
  removeMock = vi.fn().mockResolvedValue({ data: [], error: null })
  getPublicUrlMock = vi
    .fn()
    .mockImplementation((p: string) => ({ data: { publicUrl: 'https://cdn/' + p } }))

  const client: MockSupabase = {
    storage: { from: vi.fn(() => ({ upload: uploadMock, remove: removeMock, getPublicUrl: getPublicUrlMock })) },
    from: vi.fn(() => dbChain),
  }

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseClient: () => client,
  }))
}

function png(): File {
  return new File(['x'], 'a.png', { type: 'image/png' })
}

describe('photoApi', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uploadPhoto uploads to listing-photos, inserts a row and returns id/path', async () => {
    const insertRow = {
      id: 'img-1',
      path: 'listing/abc/uuid.png',
      listing_id: 'abc',
      mime_type: 'image/png',
      size_bytes: 1,
      sort_order: 0,
    }
    mockSupabaseWithStorage({ data: insertRow, error: null })

    const { uploadPhoto } = await import('./photoApi')
    const file = png()
    const res = await uploadPhoto('abc', file)

    expect(res.error).toBeNull()
    expect(res.data).toEqual({ id: 'img-1', path: 'listing/abc/uuid.png' })

    const uploadPath = uploadMock.mock.calls[0][0] as string
    expect(uploadPath.startsWith('listing/abc/')).toBe(true)
    expect(uploadPath.endsWith('.png')).toBe(true)
    expect(uploadPath).not.toContain('a.png')

    expect(dbChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ listing_id: 'abc', path: uploadPath }),
    )
  })

  it('uploadPhoto with gif does not call storage upload', async () => {
    mockSupabaseWithStorage({ data: null, error: null })
    const { uploadPhoto } = await import('./photoApi')

    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    const res = await uploadPhoto('abc', gif)

    expect(res.data).toBeNull()
    expect(res.error).toBeTruthy()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('uploadPhoto with oversize does not call storage upload', async () => {
    mockSupabaseWithStorage({ data: null, error: null })
    const { uploadPhoto } = await import('./photoApi')

    const file = png()
    Object.defineProperty(file, 'size', { value: 99999999 })
    const res = await uploadPhoto('abc', file)

    expect(res.data).toBeNull()
    expect(res.error).toBeTruthy()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('listPhotos queries listing_images ordered by sort_order', async () => {
    const rows = [{ id: '1', path: 'listing/abc/x.png' }]
    mockSupabaseWithStorage({ data: rows, error: null })

    const { listPhotos } = await import('./photoApi')
    const res = await listPhotos('abc')

    expect(res.error).toBeNull()
    expect(res.data).toEqual(rows)
    expect(dbChain.eq).toHaveBeenCalledWith('listing_id', 'abc')
    expect(dbChain.order).toHaveBeenCalledWith('sort_order', { ascending: true })
  })

  it('getPublicUrl returns a string containing the path', async () => {
    mockSupabaseWithStorage({ data: null, error: null })
    const { getPublicUrl } = await import('./photoApi')

    const url = getPublicUrl('listing/abc/x.png')
    expect(typeof url).toBe('string')
    expect(url).toContain('listing/abc/x.png')
  })

  it('removePhoto removes from storage and deletes the row', async () => {
    mockSupabaseWithStorage({ data: [], error: null })
    const { removePhoto } = await import('./photoApi')

    const res = await removePhoto('img-1', 'listing/abc/x.png')
    expect(res.error).toBeNull()
    expect(removeMock).toHaveBeenCalledWith(['listing/abc/x.png'])
    expect(dbChain.delete).toHaveBeenCalled()
    expect(dbChain.eq).toHaveBeenCalledWith('id', 'img-1')
  })
})
