interface EnvironmentNoticeProps {
  configured: boolean
}

export function EnvironmentNotice({ configured }: EnvironmentNoticeProps) {
  if (configured) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        Supabase подключён. Перед первым релизом выполните миграции и RLS-тесты.
      </p>
    )
  }

  return (
    <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <strong>Нужна настройка окружения.</strong> Скопируйте <code>.env.example</code>{' '}
      в <code>.env</code> и укажите URL и publishable key проекта Supabase. Секретный
      ключ сервиса в браузер не добавляется.
    </aside>
  )
}

