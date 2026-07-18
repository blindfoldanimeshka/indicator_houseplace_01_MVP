import { AppShell } from '@/components/layout/AppShell'
import { EnvironmentNotice } from '@/components/system/EnvironmentNotice'
import { isSupabaseConfigured } from '@/lib/env'

export function App() {
  return (
    <AppShell>
      <section className="max-w-2xl space-y-5">
        <p className="text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">
          Ранняя альфа
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Аренда жилья напрямую.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-stone-600">
          Фундамент проекта готов. Следующий вертикальный срез — безопасные
          объявления, доступные только через политики Supabase.
        </p>
        <EnvironmentNotice configured={isSupabaseConfigured()} />
      </section>
    </AppShell>
  )
}

