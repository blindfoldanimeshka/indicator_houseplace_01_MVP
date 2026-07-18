import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types/database'
import {
  listingFormSchema,
  type ListingFormValues,
} from './types'
import { createListing, updateListing } from './api'

type ListingRow = Database['public']['Tables']['listings']['Row']

const ROOMS_OPTIONS: { value: string; label: string }[] = [
  { value: 'studio', label: 'Студия' },
  { value: '1', label: '1 комната' },
  { value: '2', label: '2 комнаты' },
  { value: '3', label: '3 комнаты' },
  { value: '4+', label: '4+ комнат' },
]

interface ListingFormProps {
  initial?: ListingRow
  onSaved: () => void
  onCancel?: () => void
}

export function ListingForm({ initial, onSaved, onCancel }: ListingFormProps) {
  const { user } = useAuth()

  const [type, setType] = useState<'offer' | 'request'>(
    initial?.type ?? 'offer',
  )
  const [city, setCity] = useState(initial?.city ?? '')
  const [rooms, setRooms] = useState(initial?.rooms ?? 'studio')
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : '')
  const [area, setArea] = useState(
    initial?.area ? String(initial.area) : '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const isEditing = Boolean(initial)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setErrors({})

    const parsed = listingFormSchema.safeParse({
      type,
      city,
      rooms,
      price: price === '' ? undefined : Number(price),
      area: area === '' ? null : Number(area),
      description,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    if (!user) {
      setFormError('Войдите, чтобы сохранить объявление.')
      return
    }

    const values: ListingFormValues = parsed.data
    setStatus('saving')

    const result = isEditing
      ? await updateListing(initial!.id, user.id, values)
      : await createListing(values, user.id)

    if (result.error) {
      setStatus('error')
      setFormError(result.error)
      return
    }

    onSaved()
  }

  const fieldClass =
    'mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200'

  return (
    <section className="max-w-xl space-y-5">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-teal-800 hover:underline"
        >
          ← Назад
        </button>
      )}

      <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
        {isEditing ? 'Редактировать объявление' : 'Новое объявление'}
      </h1>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="text-sm font-medium text-stone-800">Тип</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as 'offer' | 'request')
            }
            className={fieldClass}
          >
            <option value="offer">Сдаю</option>
            <option value="request">Ищу</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">Город</span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={fieldClass}
          />
          {errors.city && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.city}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">Комнаты</span>
          <select
            value={rooms}
            onChange={(event) => setRooms(event.target.value)}
            className={fieldClass}
          >
            {ROOMS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.rooms && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.rooms}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">
            Цена, ₽ / мес.
          </span>
          <input
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className={fieldClass}
          />
          {errors.price && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.price}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">
            Площадь, м² <span className="text-stone-400">(необязательно)</span>
          </span>
          <input
            type="number"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className={fieldClass}
          />
          {errors.area && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.area}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">
            Описание{' '}
            <span className="text-stone-400">(необязательно)</span>
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className={fieldClass}
          />
          {errors.description && (
            <span className="mt-1 block text-sm text-red-700">
              {errors.description}
            </span>
          )}
        </label>

        {formError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60"
        >
          {status === 'saving'
            ? 'Сохраняем…'
            : isEditing
              ? 'Сохранить'
              : 'Опубликовать'}
        </button>
      </form>
    </section>
  )
}
