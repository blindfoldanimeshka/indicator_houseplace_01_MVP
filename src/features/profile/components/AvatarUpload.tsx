import { useRef, useState, type ChangeEvent } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

const MAX_BYTES = 5 * 1024 * 1024

function publicUrl(path: string): string {
  const client = getSupabaseClient()
  return client.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export function AvatarUpload({
  userId,
  currentPath,
  onUploaded,
}: {
  userId: string
  currentPath?: string | null
  onUploaded: (path: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(
    currentPath ? publicUrl(currentPath) : null,
  )

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('Можно загрузить только изображение.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Файл больше 5 МБ.')
      return
    }

    setUploading(true)
    const path = `avatars/${userId}`
    const client = getSupabaseClient()

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const url = publicUrl(path)
    setPreview(`${url}?t=${Date.now()}`)
    onUploaded(path)
    setUploading(false)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-stone-200">
        {preview ? (
          <img src={preview} alt="Аватар" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-400">
            ?
          </div>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:opacity-60"
        >
          {uploading ? 'Загрузка…' : 'Загрузить фото'}
        </button>
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
