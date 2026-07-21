import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types/database'
import {
  listingFormSchema,
  type ListingFormValues,
} from './types'
import { createListing, updateListing } from './api'
import { PhotoUploader } from '@/features/photos/PhotoUploader'
import { MapView } from './MapView'
import { geocodeAddress } from './geocode'
import { listMyOrganizations } from '@/features/organizations/orgApi'
import type { OrgRow } from '@/features/organizations/orgApi'

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
  const [address, setAddress] = useState(initial?.address ?? '')
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null)
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null)
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)

  const isEditing = Boolean(initial)
  const uploaderListingId = initial?.id ?? createdId

  useEffect(() => {
    if (isEditing) return
    let active = true
    listMyOrganizations().then((res) => {
      if (!active) return
      if (res.data) setOrgs(res.data)
    })
    return () => {
      active = false
    }
  }, [isEditing])

  async function handleGeocode() {
    if (!address.trim()) {
      setGeoError('Введите адрес для поиска на карте.')
      return
    }
    setGeoState('loading')
    setGeoError(null)
    const result = await geocodeAddress(`${city}, ${address}`)
    if (result) {
      setLat(result.lat)
      setLng(result.lng)
      setAddress(result.address)
      setGeoState('idle')
    } else {
      setGeoState('error')
      setGeoError('Адрес не найден. Уточните или поставьте точку на карте.')
    }
  }

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
      address,
      lat,
      lng,
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

    if (!user.email_confirmed_at) {
      setFormError('Подтвердите email, чтобы опубликовать объявление.')
      return
    }

    const values: ListingFormValues = parsed.data
    setStatus('saving')

    const result = isEditing
      ? await updateListing(initial!.id, user.id, values)
      : await createListing(values, user.id, orgId)

    if (result.error) {
      setStatus('error')
      setFormError(result.error)
      return
    }

    if (!isEditing && result.data) {
      setCreatedId((result.data as { id: string }).id)
      setStatus('idle')
      return
    }

    onSaved()
  }

  const fieldClass =
    'w-full rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition duration-[var(--duration-base)] focus:border-primary focus:ring-2 focus:ring-secondary/40'

  return (
    <section className="max-w-xl space-y-5">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Назад
        </button>
      )}

      <h1 className="font-display text-3xl tracking-tight text-foreground">
        {isEditing ? 'Редактировать объявление' : 'Новое объявление'}
      </h1>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Тип</span>
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

        {orgs.length > 0 && !isEditing && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Организация{' '}
              <span className="text-stone-400">(необязательно)</span>
            </span>
            <select
              value={orgId ?? ''}
              onChange={(event) => setOrgId(event.target.value || null)}
              className={fieldClass}
            >
              <option value="">Лично</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Город</span>
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

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Комнаты</span>
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

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
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

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
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

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
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

        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Адрес / ориентир{' '}
              <span className="text-stone-400">(необязательно)</span>
            </span>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="ул. Тверская, 13"
              className={fieldClass}
            />
            {errors.address && (
              <span className="mt-1 block text-sm text-red-700">
                {errors.address}
              </span>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geoState === 'loading'}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition duration-[var(--duration-base)] hover:bg-muted/60 hover:border-primary/40 disabled:opacity-60"
            >
              {geoState === 'loading' ? 'Ищем…' : 'Найти на карте'}
            </button>
            {(lat !== null && lng !== null) && (
              <span className="text-xs text-muted-foreground">
                Точка: {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            )}
          </div>

          {geoError && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {geoError}
            </p>
          )}

          {(lat !== null && lng !== null) && (
            <MapView
              lat={lat}
              lng={lng}
              address={address}
              height={240}
              selectable
              onSelect={(newLat, newLng) => {
                setLat(newLat)
                setLng(newLng)
              }}
            />
          )}
        </div>

        {formError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition duration-[var(--duration-base)] ease-[var(--ease-smooth)] hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {status === 'saving'
              ? 'Сохраняем…'
              : isEditing
                ? 'Сохранить'
                : 'Опубликовать'}
          </button>
        </form>

        {uploaderListingId && (
          <div className="pt-5">
            <PhotoUploader listingId={uploaderListingId} />
            {!isEditing && (
              <button
                type="button"
                onClick={onSaved}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition duration-[var(--duration-base)] ease-[var(--ease-smooth)] hover:brightness-110 active:scale-[0.98]"
              >
                Готово
              </button>
            )}
          </div>
        )}
      </section>
  )
}
