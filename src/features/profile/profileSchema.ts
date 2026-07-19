import { z } from 'zod'

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Укажите имя.' })
    .max(100, { message: 'Имя не длиннее 100 символов.' }),
  city: z
    .string()
    .trim()
    .max(100, { message: 'Город не длиннее 100 символов.' })
    .optional()
    .or(z.literal('')),
  avatarPath: z.string().nullable().optional(),
})

export const authSchema = z.object({
  email: z.email({ message: 'Введите корректный email.' }),
  password: z
    .string()
    .min(8, { message: 'Пароль не короче 8 символов.' }),
  name: profileSchema.shape.name,
  city: profileSchema.shape.city,
})

export type ProfileInput = z.infer<typeof profileSchema>
export type AuthInput = z.infer<typeof authSchema>
