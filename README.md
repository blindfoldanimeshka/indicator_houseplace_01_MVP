# напрямую — аренда жилья без агентств

Прямая аренда жилья между людьми: собственник публикует «Сдаю»,
арендатор ищет «Ищу», они переписываются в чате — без посредников
и комиссий. MVP уже работает и проверен на реальном стеке.

Репозиторий: `github.com/blindfoldanimeshka/indicator_houseplace_01_MVP`
Проект Supabase: **MVP-House** (`uwinrqeyixdnemszhxoj`, eu-north-1).

## Что умеет MVP

- Регистрация по email+пароль (с подтверждением) и вход через OAuth
  (Yandex / VK / Telegram).
- Публикация объявлений «Сдаю» / «Ищу» с фото (до 10, ≤5 МБ).
- Лента с фильтрами (город, комнаты, цена, тип) и пагинацией.
- Чат по объявлению в реальном времени (Supabase Realtime), доступный
  с любого устройства.
- Жалобы на объявление / собеседника (moderation_audit, только service_role).

## Технологический стек

| Слой | Технология |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 |
| Анимации | framer-motion 12 |
| Валидация | zod 4 |
| Бэкенд | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Клиент БД/Auth | @supabase/supabase-js v2 |
| Тесты | Vitest 4 + Testing Library + MSW |
| Линт/типы | ESLint 10 + TypeScript (6 + native 7) |

> Историческая альтернатива «через Next.js + Telegram Login» описана в
> `docs/out-of-code/plan-legacy-nextjs.md` — она **устарела**, стек выбран
> Supabase (см. `docs/progress.md`).

## Быстрый старт

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # tsc -b && vite build → dist/
npm run test     # vitest run
npm run lint     # eslint .
```

Переменные окружения (через `.env`, не в git):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
(см. `src/lib/env.ts`).

## Документация

Подробная документация проекта — в `docs/`:

- `docs/progress.md` — **основной индекс прогресса** по фазам (что сделано
  и что требует решения пользователя).
- `docs/README.md` → перенесено сюда; навигация по документам ниже.
- `docs/frontend.md` — фронтенд: стек, структура `src/`, навигация, экраны.
- `docs/backend.md` — Supabase как бэкенд (Auth, RPC, Realtime, Storage).
- `docs/db.md` — схема БД, RLS, миграции (`supabase/migrations/`).
- `docs/security-review.md` — отчёт по безопасности (матрица RLS-изоляции).
- `docs/technical-specification-roadmap.md` — ТЗ и roadmap MVP (исходный план).
- `docs/out-of-code/` — задачи вне кода (CAPTCHA, SMTP, 152-ФЗ, закрытая бета).
- `docs/features/` — документация по конкретным фичам.
- `docs/superpowers/specs/` — дизайн-спеки по фазам.
