import { z } from 'zod'

export const MAX_REPORT_COMMENT = 1000

export const reportCategorySchema = z
  .string()
  .trim()
  .min(1, { message: 'Укажите причину жалобы.' })
  .max(50, { message: 'Категория не длиннее 50 символов.' })

export const reportCommentSchema = z
  .string()
  .max(MAX_REPORT_COMMENT, {
    message: `Комментарий не длиннее ${MAX_REPORT_COMMENT} символов.`,
  })
  .default('')

export const reportTargetTypeSchema = z.enum(['listing', 'chat', 'message'])

export const reportFormSchema = z.object({
  targetType: reportTargetTypeSchema,
  category: reportCategorySchema,
  comment: reportCommentSchema,
})

export type ReportFormValues = z.infer<typeof reportFormSchema>
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>
