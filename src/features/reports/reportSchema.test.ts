import { describe, expect, it } from 'vitest'
import {
  reportCategorySchema,
  reportCommentSchema,
  reportTargetTypeSchema,
  reportFormSchema,
} from './reportSchema'

describe('reportSchema', () => {
  it('valid category + comment passes', () => {
    expect(reportCategorySchema.safeParse('Спам').success).toBe(true)
    expect(
      reportFormSchema.safeParse({
        targetType: 'listing',
        category: 'Спам',
        comment: 'текст жалобы',
      }).success,
    ).toBe(true)
  })

  it('empty category fails', () => {
    expect(reportCategorySchema.safeParse('').success).toBe(false)
    expect(
      reportFormSchema.safeParse({
        targetType: 'listing',
        category: '',
        comment: '',
      }).success,
    ).toBe(false)
  })

  it('category longer than 50 chars fails (trimmed)', () => {
    const long = 'а'.repeat(51)
    expect(reportCategorySchema.safeParse(long).success).toBe(false)
    expect(reportCategorySchema.safeParse(`  ${'а'.repeat(51)}  `).success).toBe(
      false,
    )
  })

  it('comment longer than 1000 chars fails', () => {
    const long = 'а'.repeat(1001)
    expect(reportCommentSchema.safeParse(long).success).toBe(false)
  })

  it('empty comment passes (defaults to empty string)', () => {
    const parsed = reportCommentSchema.safeParse('')
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toBe('')
    }
  })

  it('invalid targetType fails', () => {
    expect(reportTargetTypeSchema.safeParse('user').success).toBe(false)
    expect(reportTargetTypeSchema.safeParse('listing').success).toBe(true)
  })
})
