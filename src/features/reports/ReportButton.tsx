import { useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  reportFormSchema,
  reportTargetTypeSchema,
  MAX_REPORT_COMMENT,
  type ReportTargetType,
} from './reportSchema'
import { createReport } from './reportApi'

const CATEGORIES = ['Спам', 'Мошенничество', 'Нецензурная речь', 'Другое']

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
}

type Status = 'idle' | 'sending' | 'success' | 'error'

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const targetTypeValid = reportTargetTypeSchema.safeParse(targetType).success
  const parsed = reportFormSchema.safeParse({ targetType, category, comment })
  const isValid = parsed.success

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isValid || !user || status === 'sending') return

    setStatus('sending')
    setMessage(null)

    const result = await createReport(
      { targetType, targetId, category: category.trim(), comment },
      user.id,
    )

    if (result.error === 'already_reported') {
      setStatus('error')
      setMessage('Вы уже пожаловались на это.')
      return
    }
    if (result.error) {
      setStatus('error')
      setMessage('Не удалось отправить жалобу. Попробуйте позже.')
      return
    }

    setStatus('success')
    setMessage('Жалоба отправлена')
  }

  if (!targetTypeValid) return null

  return (
    <div className="space-y-2">
      {!open && status !== 'success' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-stone-700 hover:underline"
        >
          Пожаловаться
        </button>
      )}

      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-border-muted bg-stone-50 p-3"
        >
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Причина</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-border-muted bg-white px-2 py-1.5 text-sm text-foreground outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Комментарий
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={MAX_REPORT_COMMENT}
              rows={3}
              placeholder="Необязательно…"
              className="w-full resize-none rounded-lg border border-border-muted bg-white px-2 py-1.5 text-sm text-foreground outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200"
            />
            <span className="block text-right text-[11px] text-stone-400">
              {comment.length} / {MAX_REPORT_COMMENT}
            </span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setStatus('idle')
                setMessage(null)
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!isValid || status === 'sending'}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-40"
            >
              {status === 'sending'
                ? 'Отправляем…'
                : status === 'error'
                  ? 'Отправить повторно'
                  : 'Отправить'}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p
          className={`text-xs ${
            status === 'success' ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
