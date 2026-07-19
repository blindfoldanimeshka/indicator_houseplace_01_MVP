# напрямую — аренда жилья без агентств

Индекс документации проекта. **MVP уже реализован и работает** на стеке
React 19 + Vite + Supabase (не Next.js/NestJS/Prisma, как планировалось
изначально — см. историю решений в `progress.md`).

Репозиторий: `github.com/blindfoldanimeshka/indicator_houseplace_01_MVP`
Проект Supabase: **MVP-House** (`uwinrqeyixdnemszhxoj`, eu-north-1).

## Документы

- `progress.md` — **основной индекс прогресса** по фазам (фактическое
  состояние продукта, что сделано и что требует решения пользователя).
- `backend.md` — Supabase как бэкенд: Auth, PostgreSQL, Realtime, Storage,
  RPC-функции.
- `db.md` — схема БД, RLS, миграции (`supabase/migrations/`).
- `frontend.md` — фронтенд: стек, структура `src/`, навигация, экраны.
- `security-review.md` — отчёт по безопасности (матрица RLS-изоляции).
- `technical-specification-roadmap.md` — ТЗ и roadmap MVP (исходный план).
- `real-estate-listing.md` — спецификация размещения объявления (форма,
  карта, геокодинг).
- `features/` — документация по конкретным фичам (`profile/`,
  `social-connections.md`).
- `out-of-code/` — задачи вне кода, требующие внешних ключей/решений
  пользователя или юр. проверки (CAPTCHA, SMTP, 152-ФЗ, закрытая бета).
- `superpowers/specs/` — дизайн-спеки по фазам (auth/profile, chat,
  listings, photos, reports, deferred-auth).

## Что такое MVP в этом проекте (достигнуто)

Реальные пользователи могут:
1. Зарегистрироваться по email+паролю (подтверждение email), войти через
   OAuth-провайдеры (Yandex/VK/Telegram).
2. Опубликовать объявление «Сдаю» или «Ищу» с фото (до 10, ≤5 МБ).
3. Найти чужое объявление через ленту с фильтрами (город, комнаты, цена,
   тип) и пагинацией.
4. Написать автору объявления и получить ответ — переписка в реалтайме
   (Supabase Realtime), доступна с любого устройства.
5. Пожаловаться на объявление/собеседника (жалоба пишется в
   `moderation_audit`, доступно только service_role).

## Технологический стек (фактический)

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
> `out-of-code/plan-legacy-nextjs.md` — она **устарела**, стек выбран
> Supabase (см. `progress.md`, раздел «Решения, зафиксированные в ходе
> работы»).

## Быстрый старт

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # tsc -b && vite build → dist/
npm run test       # vitest run
npm run lint       # eslint .
```

Переменные окружения (через `.env`, не в git): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` (см. `src/lib/env.ts`).
