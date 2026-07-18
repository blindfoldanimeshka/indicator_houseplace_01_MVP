# напрямую

MVP сервиса прямой аренды жилья без посредников. Текущая основа — React,
TypeScript, Vite и Supabase с доступом к данным через Row Level Security.

## Быстрый старт

Нужен Node.js 22.12 или новее.

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Заполните `.env` значениями из Supabase Dashboard. В браузер передаётся только
`VITE_SUPABASE_PUBLISHABLE_KEY`; `service_role` и другие секреты нельзя
добавлять в переменные `VITE_*`.

## Команды

```bash
npm run dev        # development server
npm run build      # typecheck и production build
npm run lint       # ESLint
npm run test       # unit-тесты
npm run typecheck  # TypeScript без сборки
```

## Структура

```text
src/
  app/           # композиция приложения
  components/    # UI-компоненты без доступа к данным
  lib/           # окружение и клиенты внешних сервисов
  styles/        # глобальный CSS и дизайн-токены
  test/          # общая настройка тестов
  types/         # типы, сгенерированные из Supabase
supabase/        # SQL-миграции и политики RLS (следующая фаза)
docs/            # ТЗ и roadmap
```

Порядок реализации и требования безопасности: [ТЗ и roadmap](docs/technical-specification-roadmap.md).

