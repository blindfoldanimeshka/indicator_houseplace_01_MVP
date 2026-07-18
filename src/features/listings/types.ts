import { z } from 'zod'

export const listingTypeSchema = z.enum(['offer', 'request'])

export const listingFiltersSchema = z.object({
  type: listingTypeSchema.optional(),
  city: z.string().trim().max(100).optional(),
  rooms: z.string().trim().max(20).optional(),
  maxPrice: z.number().int().positive().optional(),
})

export type ListingFilters = z.infer<typeof listingFiltersSchema>

