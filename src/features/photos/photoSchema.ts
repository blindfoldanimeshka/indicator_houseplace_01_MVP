import { z } from 'zod'

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const MAX_BYTES = 10_485_760
export const MAX_PHOTOS = 10

export const photoFileSchema = z
  .instanceof(File, { message: 'Ожидается файл изображения.' })
  .refine((file) => (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type), {
    message: 'Допустимы только JPEG, PNG или WebP.',
  })
  .refine((file) => file.size <= MAX_BYTES, {
    message: 'Размер файла не должен превышать 10 МБ.',
  })

export const photoListSchema = z
  .array(photoFileSchema)
  .max(MAX_PHOTOS, { message: `Не более ${MAX_PHOTOS} фотографий.` })

export type PhotoFile = z.infer<typeof photoFileSchema>
export type PhotoList = z.infer<typeof photoListSchema>
