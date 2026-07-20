import { useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { ConfirmDialog } from './ConfirmDialog'

export function DangerTab() {
  const { signOut, deleteAccount } = useAuth()

  const [signOutOpen, setSignOutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleConfirmSignOut() {
    setSignOutOpen(false)
    setError(null)
    setLoading(true)
    const result = await signOut()
    setLoading(false)
    if (result.error) {
      setError(result.error)
    }
  }

  async function handleConfirmDelete() {
    setDeleteOpen(false)
    setError(null)
    setLoading(true)
    const result = await deleteAccount()
    if (result.error) {
      setLoading(false)
      setError(result.error)
      return
    }
    await signOut()
    setLoading(false)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-surface)]">
        <h2 className="text-base font-semibold text-foreground">Выйти</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Завершить сессию на этом устройстве.
        </p>
        <button
          type="button"
          onClick={() => setSignOutOpen(true)}
          disabled={loading}
          className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/50 disabled:opacity-60"
        >
          Выйти
        </button>
      </div>

      <div className="rounded-2xl bg-red-500/5 p-5 shadow-[var(--shadow-surface)]">
        <h2 className="text-base font-semibold text-red-800">Удалить аккаунт</h2>
        <p className="mt-1 text-sm text-red-700">
          Это действие удалит ваши данные безвозвратно.
        </p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={loading}
          className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 transition duration-[--duration-base] hover:bg-red-500/10 disabled:opacity-60"
        >
          Удалить аккаунт
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      <ConfirmDialog
        isOpen={signOutOpen}
        title="Выйти из аккаунта"
        message="Вы уверены, что хотите выйти?"
        confirmLabel="Выйти"
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleConfirmSignOut}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Удалить аккаунт"
        message="Вы уверены? Аккаунт и все данные будут удалены безвозвратно."
        confirmLabel="Удалить"
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}
