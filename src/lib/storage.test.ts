import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the supabase client
const mockStorage = {
  from: vi.fn(() => ({
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
  })),
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    storage: mockStorage,
  })),
}))

// Import after mocking
import {
  objectName,
  getAvatarPublicUrl,
  getListingPhotoUrl,
  removeAvatar,
  removeListingPhoto,
  storageBuckets,
} from '@/lib/storage'

describe('storage utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage.from.mockClear()
  })

  describe('storageBuckets', () => {
    it('has correct bucket names', () => {
      expect(storageBuckets.avatars).toBe('avatars')
      expect(storageBuckets.listingPhotos).toBe('listing-photos')
    })
  })

  describe('objectName', () => {
    it('strips avatars/ prefix', () => {
      expect(objectName('avatars/user123')).toBe('user123')
    })

    it('strips listing-photos/ prefix', () => {
      expect(objectName('listing-photos/listing123/photo.jpg')).toBe('listing123/photo.jpg')
    })

    it('returns as-is when no prefix', () => {
      expect(objectName('user123')).toBe('user123')
      expect(objectName('listing123/photo.jpg')).toBe('listing123/photo.jpg')
    })

    it('handles null/undefined', () => {
      expect(objectName(null)).toBeNull()
      expect(objectName(undefined)).toBeUndefined()
    })

    it('strips only one level of prefix', () => {
      // Should not double-strip
      expect(objectName('avatars/avatars/user123')).toBe('avatars/user123')
    })
  })

  describe('getAvatarPublicUrl', () => {
    it('does not double the avatars/ prefix', () => {
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/user123' },
      })
      mockStorage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl, remove: vi.fn() })

      const url = getAvatarPublicUrl('avatars/user123')

      expect(mockStorage.from).toHaveBeenCalledWith('avatars')
      expect(mockGetPublicUrl).toHaveBeenCalledWith('user123')
      expect(url).toBe('https://example.com/avatars/user123')
    })

    it('works with bare userId', () => {
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/user123' },
      })
      mockStorage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl, remove: vi.fn() })

      const url = getAvatarPublicUrl('user123')

      expect(mockGetPublicUrl).toHaveBeenCalledWith('user123')
      expect(url).toBe('https://example.com/avatars/user123')
    })

it('returns null for null/undefined', () => {
      expect(getAvatarPublicUrl(null as string | null)).toBeNull()
      expect(getAvatarPublicUrl(undefined as string | undefined)).toBeNull()
    })
  })

  describe('getListingPhotoUrl', () => {
    it('does not double the listing-photos/ prefix', () => {
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/listing-photos/listing123/photo.jpg' },
      })
      mockStorage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl, remove: vi.fn() })

      const url = getListingPhotoUrl('listing-photos/listing123/photo.jpg')

      expect(mockStorage.from).toHaveBeenCalledWith('listing-photos')
      expect(mockGetPublicUrl).toHaveBeenCalledWith('listing123/photo.jpg')
      expect(url).toBe('https://example.com/listing-photos/listing123/photo.jpg')
    })

    it('works with bare path', () => {
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/listing-photos/listing123/photo.jpg' },
      })
      mockStorage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl, remove: vi.fn() })

      const url = getListingPhotoUrl('listing123/photo.jpg')

      expect(mockGetPublicUrl).toHaveBeenCalledWith('listing123/photo.jpg')
      expect(url).toBe('https://example.com/listing-photos/listing123/photo.jpg')
    })
  })

  describe('removeAvatar', () => {
    it('passes bare userId to storage remove', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      mockStorage.from.mockReturnValue({ getPublicUrl: vi.fn(), remove: mockRemove })

      await removeAvatar('user123')

      expect(mockStorage.from).toHaveBeenCalledWith('avatars')
      expect(mockRemove).toHaveBeenCalledWith(['user123'])
    })
  })

  describe('removeListingPhoto', () => {
    it('strips prefix and passes bare path to storage remove', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      mockStorage.from.mockReturnValue({ getPublicUrl: vi.fn(), remove: mockRemove })

      await removeListingPhoto('listing-photos/listing123/photo.jpg')

      expect(mockStorage.from).toHaveBeenCalledWith('listing-photos')
      expect(mockRemove).toHaveBeenCalledWith(['listing123/photo.jpg'])
    })

    it('works with bare path', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      mockStorage.from.mockReturnValue({ getPublicUrl: vi.fn(), remove: mockRemove })

      await removeListingPhoto('listing123/photo.jpg')

      expect(mockRemove).toHaveBeenCalledWith(['listing123/photo.jpg'])
    })
  })
})