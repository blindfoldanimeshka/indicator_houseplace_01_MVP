# Прогресс реализации MVP «напрямую»

Отслеживаем выполнение roadmap из `technical-specification-roadmap.md`.
Статус обновляется после каждого завершённого вертикального среза.

| Фаза | Результат | Статус | Заметки |
|---|---|---|---|
| 0. Инвентаризация | Понятная стартовая точка | ✅ | `.env` не в git; старый код удалён; новый стек (React 19 + Vite + TS + Tailwind 4 + Zod) на месте |
| 1. Основание | Безопасная пустая сборка | ✅ | Сборка собирается, lint/typecheck/test зелёные |
| 2. Миграция БД и RLS | Надёжная модель доступа | ✅ | `202607190001_initial_secure_schema.sql` накатана на проект `MVP-House`; прямые INSERT в chats/chat_participants закрыты; RPC `open_or_create_chat` |
| 3. Auth и профиль | Безопасный вход | ✅ | `AuthProvider`, `AuthScreen`, `ProfileScreen`; 18 тестов; email-confirmation guard на клиенте |
| 4. Объявления | Сквозной CRUD | ✅ | Feed (публичная лента с фильтрами/пагинацией), создание/редактирование/архив своих объявлений, детальный просмотр; `author_id` только из сессии; 36 тестов |
| 5. Фото | Безопасные изображения | ✅ | Bucket `listing-photos` (публичный, ≤10MB, JPEG/PNG/WebP), таблица `listing_images`, Storage RLS (только автор), PhotoUploader (≤10 фото, валидация типа/размера, путь `listing/{id}/{uuid}`); 49 тестов |
| 6. Чат | Связь между пользователями | ✅ | RPC `open_or_create_chat` (атомарно), ChatList, Thread (realtime + polling-fallback), кнопка «Написать» в деталях; `sender_id` из сессии; 68 тестов |
| 7. Жалобы и финальная защита | Контролируемая beta | ✅ | UI «Пожаловаться» (объявление+чат), таблица `moderation_audit` (только service role), security-review.md с RLS-матрицей; 83 теста; единственный lint-ворнинг (`open_or_create_chat` SECURITY DEFINER) — намеренный и безопасный |
| 8. Закрытая beta | Реальная обратная связь | ⬜ | |

## Security hardening (post-review)

- `202607190004_security_hardening.sql` накатана на проект `MVP-House`:
  - лимит ≤10 фото/объявление принудительно на уровне БД (триггер `listing_images_limit`);
  - валидация пути `private.listing_id_from_path` через regex (защита от путей-инъекций);
  - Realtime RLS включён для `messages` и `chats` (`supabase_realtime`).
- Документация синхронизирована с миграциями: `supabase/schema.sql` помечен DEPRECATED,
  `docs/security-review.md` отражает RPC-only создание чатов (без прямого INSERT).

## Решения, зафиксированные в ходе работы

- **Стек — Supabase, без Next.js/NestJS/Prisma.** Согласно roadmap §1; `docs/plan.md`
  предлагает альтернативу (Telegram + Next.js), но roadmap имеет приоритет и код
  уже построен на Supabase Auth.
- **`listing_status` без `pending`.** В текущей схеме объявление создаётся как
  `active`. Ручная модерация (ТЗ §4.5) потребует добавления `pending` отдельной
  миграцией — пока не реализуем (YAGNI до появления модератора).
- **`.env` использует `VITE_SUPABASE_PUBLISHABLE_KEY`** (каноничное имя из ТЗ §3),
  совпадает с `src/lib/env.ts`.
