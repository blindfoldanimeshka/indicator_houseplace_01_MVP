import { useRef, useState, type ChangeEvent } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

const MAX_BYTES = 5 * 1024 * 1024
const TARGET_SIZE = 500

// Stored avatar_path is the bare user id (object name is `avatars/{userId}`).
// Strip a possible accidental `avatars/` prefix so the public URL is never doubled.
function objectName(path: string | null | undefined): string | null {
  if (!path) return null
  return path.replace(/^avatars\//, '')
}

function publicUrl(path: string | null | undefined): string | null {
  const bare = objectName(path)
  if (!bare) return null
  const client = getSupabaseClient()
  // `getPublicUrl` already prepends the bucket name, so pass the bare object
  // name (`{userId}`), not `avatars/{userId}` — otherwise the URL becomes
  // `avatars/avatars/{userId}` and the image 404s.
  return client.storage.from('avatars').getPublicUrl(bare).data.publicUrl
}

// Resize/crop the image to a centered TARGET_SIZE x TARGET_SIZE square on a
// canvas, then return it as a PNG blob. Supabase Storage does not resize
// server-side, so this must happen on the client.
async function resizeToSquare(file: File, size: number): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', {
    type: 'image/png',
  })
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
  const [preview, setPreview] = useState<string | null>(publicUrl(currentPath))

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
    const client = getSupabaseClient()

    // 1. Fully remove any previous avatar so there is never more than one
    //    object per user and no history of prior avatars is kept.
    await client.storage.from('avatars').remove([`avatars/${userId}`])

    // 2. Resize to a 500x500 square on the client.
    let toUpload: File
    try {
      toUpload = await resizeToSquare(file, TARGET_SIZE)
    } catch {
      toUpload = file
    }

    // 3. Upload. supabase-js prefixes the bucket name, so pass the bare id:
    //    the stored object becomes `avatars/{userId}`, which the RLS helper
    //    user_id_from_avatar_path(name) parses via array_split(name,'/')[2].
    //    We avoid `upsert` (it triggers a pre-delete that must also pass RLS)
    //    since we already removed the old object explicitly above.
    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(userId, toUpload, { upsert: false, contentType: 'image/png' })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    // Persist the bare user id as avatar_path (object name is `avatars/{userId}`).
    const url = publicUrl(userId)
    setPreview(`${url}?t=${Date.now()}`)
    onUploaded(userId)
    setUploading(false)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted/80">
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
          className="rounded-xl border border-border-muted px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/50 disabled:opacity-60"
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
