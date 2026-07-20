import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { listPhotos, getPublicUrl, removePhoto, uploadPhoto, MAX_PHOTOS } from './photoApi'
import { photoFileSchema } from './photoSchema'

interface PhotoDescriptor {
  id: string
  path: string
  url: string
}

interface UploadingFile {
  name: string
  status: 'uploading' | 'error'
  error?: string
}

interface PhotoUploaderProps {
  listingId: string
}

export function PhotoUploader({ listingId }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<PhotoDescriptor[]>([])
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    const result = await listPhotos(listingId)
    if (result.error) {
      setError(result.error)
      setPhotos([])
    } else {
      setPhotos(
        (result.data ?? []).map((row) => ({
          id: row.id,
          path: row.path,
          url: getPublicUrl(row.path),
        })),
      )
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [listingId])

  async function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) return

    setError(null)

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      setError(`Можно загрузить не более ${MAX_PHOTOS} фотографий.`)
      return
    }

    const accepted = files.slice(0, remaining)
    const rejected = files.slice(remaining)

    if (rejected.length > 0) {
      setError(
        `Можно загрузить не более ${MAX_PHOTOS} фотографий. Лишние файлы проигнорированы.`,
      )
    }

    const valid: File[] = []
    for (const file of accepted) {
      const parsed = photoFileSchema.safeParse(file)
      if (!parsed.success) {
        setUploading((prev) => [
          ...prev,
          { name: file.name, status: 'error', error: parsed.error.issues[0]?.message },
        ])
      } else {
        valid.push(file)
      }
    }

    for (const file of valid) {
      const key = file.name
      setUploading((prev) => [...prev, { name: key, status: 'uploading' }])

      const result = await uploadPhoto(listingId, file, photos.length)
      if (result.error || !result.data) {
        setUploading((prev) =>
          prev.map((u) =>
            u.name === key ? { ...u, status: 'error', error: result.error ?? 'Ошибка' } : u,
          ),
        )
        continue
      }

      setUploading((prev) => prev.filter((u) => u.name !== key))
      setPhotos((prev) => [
        ...prev,
        { id: result.data!.id, path: result.data!.path, url: getPublicUrl(result.data!.path) },
      ])
    }
  }

  async function handleRemove(id: string, path: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    const result = await removePhoto(id, path)
    if (result.error) {
      setError(result.error)
      void refresh()
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Фотографии</h2>
        <span className="text-xs text-muted-foreground">
          {photos.length} / {MAX_PHOTOS}
        </span>
      </div>

      {error && (
        <p className="rounded-xl bg-red/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка фотографий…</p>
      ) : photos.length === 0 && uploading.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет фотографий.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="group relative overflow-hidden rounded-xl bg-muted/40 shadow-[var(--shadow-surface)] transition hover:border-primary/40"
            >
              <img
                src={photo.url}
                alt="Фото объявления"
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(photo.id, photo.path)}
                className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-black"
              >
                Удалить
              </button>
            </li>
          ))}

          {uploading.map((file) => (
            <li
              key={file.name}
              className="flex aspect-square flex-col items-center justify-center rounded-xl bg-muted/40 p-3 text-center"
            >
              <span className="line-clamp-2 text-xs text-muted-foreground">{file.name}</span>
              {file.status === 'uploading' ? (
                <span className="mt-2 text-xs text-primary">Загрузка…</span>
              ) : (
                <span className="mt-2 text-xs text-red-300">{file.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {photos.length < MAX_PHOTOS && (
        <label className="inline-flex cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 active:scale-[0.98]">
          Добавить фото
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleSelect}
          />
        </label>
      )}
    </section>
  )
}
