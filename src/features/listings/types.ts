import { z } from 'zod'

export const listingTypeSchema = z.enum(['offer', 'request'])

export const listingFiltersSchema = z.object({
  type: listingTypeSchema.optional(),
  city: z.string().trim().max(100).optional(),
  rooms: z.string().trim().max(20).optional(),
  maxPrice: z.number().int().positive().optional(),
  sort: z.enum(['newest']).optional(),
})

export type ListingFilters = z.infer<typeof listingFiltersSchema>

export const listingFormSchema = z.object({
  type: z.enum(['offer', 'request'], {
    message: 'Выберите тип объявления.',
  }),
  city: z
    .string()
    .trim()
    .min(2, { message: 'Город: от 2 символов.' })
    .max(100, { message: 'Город не длиннее 100 символов.' }),
  rooms: z.enum(['studio', '1', '2', '3', '4+'], {
    message: 'Выберите количество комнат.',
  }),
  price: z
    .number({ message: 'Укажите цену.' })
    .int({ message: 'Цена — целое число.' })
    .min(1, { message: 'Цена не меньше 1.' })
    .max(10_000_000, { message: 'Цена не больше 10 000 000.' }),
  area: z
    .number({ message: 'Площадь — число.' })
    .int({ message: 'Площадь — целое число.' })
    .min(1, { message: 'Площадь не меньше 1.' })
    .max(10_000, { message: 'Площадь не больше 10 000.' })
    .optional()
    .nullable(),
  address: z
    .string()
    .max(300, { message: 'Адрес не длиннее 300 символов.' })
    .default(''),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  description: z
    .string()
    .max(2000, { message: 'Описание не длиннее 2000 символов.' })
    .default(''),
})

export type ListingFormValues = z.infer<typeof listingFormSchema>
