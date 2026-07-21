# Backend / Database Analysis — «напрямую» MVP

> **Авторитетный источник.** Этот файл сгенерирован из реальных
> миграций в `supabase/migrations/` (16 файлов, 2026-07-19 → 2026-07-20).
> Он ПЕРЕКРЫВАЕТ устаревшие `docs/backend.md` и `docs/db.md`
> (те описывают планируемый стек и ссылаются на `supabase/schema.sql`,
> который является read-only исторической копией и НЕ накатывается на
> работающий проект). Для любой работы с БД/бэкендом читайте миграции
> и этот файл, а не `docs/db.md`.

Стек: **Supabase** (PostgreSQL 15 + Auth + Realtime + Storage + Edge Functions).
Клиент: `@supabase/supabase-js` v2 (`src/lib/supabase.js`).
Проект: **MVP-House** (`uwinrqeyixdnemszhxoj`, eu-north-1).

---

## 1. Модель данных (актуальная, из миграций)

### ENUMs (`202607190001`)
| Тип | Значения |
|---|---|
| `public.listing_type` | `'offer'` (Сдаётся), `'request'` (Ищут) |
| `public.listing_status` | `'active'`, `'archived'`, `'rejected'` |
| `public.report_target_type` | `'listing'`, `'chat'`, `'message'` |
| `public.report_status` | `'new'`, `'reviewed'`, `'resolved'` |

### Таблицы

**`public.users`** (`202607190001` + колонки `avatar_path` `202607190010`, `telegram_id` `202607190011`)
- `id uuid PK → auth.users(id) ON DELETE CASCADE`
- `name varchar(100) NOT NULL` (trim, 1–100)
- `city varchar(100)`
- `avatar_path text` (путь к файлу в бакете `avatars/{user_id}`)
- `telegram_id text UNIQUE` (привязка вручную из Edge Function, не OAuth)
- `created_at timestamptz`

**`public.listings`** (`202607190001` + `address/lat/lng` `202607190007` + `is_mock` `202607200001`)
- `id uuid PK`
- `author_id uuid → users(id) ON DELETE CASCADE` **(неизменяемо пользователем)**
- `type listing_type NOT NULL`
- `city varchar(100) NOT NULL` (trim, 2–100)
- `rooms varchar(20) NOT NULL` ∈ `studio|1|2|3|4+`
- `price integer NOT NULL` (1–10 000 000)
- `area integer` (1–10 000, nullable)
- `description text` (≤2000)
- `status listing_status NOT NULL DEFAULT 'active'` **(неизменяемо пользователем)**
- `address text NOT NULL DEFAULT ''` (≤300)
- `lat double precision` / `lng double precision` (оба NULL или валидные: lat ∈ [-90,90], lng ∈ [-180,180])
- `created_at timestamptz` **(неизменяемо)**
- `updated_at timestamptz` (триггер)
- `deleted_at timestamptz` (soft delete; NULL = видимо)
- `is_mock boolean NOT NULL DEFAULT false` (seed/demo листинги, MOCK-бейдж)

**`public.chats`** (`202607190001`)
- `id uuid PK`
- `listing_id uuid → listings(id) ON DELETE CASCADE`
- `initiator_id uuid → users(id) ON DELETE CASCADE`
- `created_at timestamptz`
- `UNIQUE (listing_id, initiator_id)`

**`public.chat_participants`** (`202607190001`)
- `chat_id uuid → chats(id) ON DELETE CASCADE`
- `user_id uuid → users(id) ON DELETE CASCADE`
- `created_at timestamptz`
- `PRIMARY KEY (chat_id, user_id)`

**`public.messages`** (`202607190001`)
- `id uuid PK`
- `chat_id uuid → chats(id) ON DELETE CASCADE`
- `sender_id uuid → users(id) ON DELETE CASCADE`
- `text text NOT NULL` (trim, 1–2000)
- `created_at timestamptz`

**`public.reports`** (`202607190001`)
- `id uuid PK`
- `reporter_id uuid → users(id) ON DELETE CASCADE`
- `target_type report_target_type NOT NULL`
- `target_id uuid NOT NULL` (полиморфная ссылка — НЕ FK)
- `category varchar(50) NOT NULL` (trim, 1–50)
- `comment text` (≤1000)
- `status report_status NOT NULL DEFAULT 'new'`
- `created_at timestamptz`
- `reviewed_at timestamptz`
- `reviewed_by uuid → users(id) ON DELETE SET NULL`
- `UNIQUE (reporter_id, target_type, target_id) WHERE status IN ('new','reviewed')` — одна открытая жалоба на цель

**`public.listing_images`** (`202607190002`)
- `id uuid PK`
- `listing_id uuid → listings(id) ON DELETE CASCADE`
- `path text NOT NULL` (непустой)
- `sort_order integer DEFAULT 0`
- `size_bytes integer`, `mime_type text` ∈ `image/jpeg|image/png|image/webp`
- `created_at timestamptz`
- индекс `(listing_id, sort_order)`

**`public.moderation_audit`** (`202607190003`) — **только service_role**
- `id uuid PK`, `moderator_id uuid → users(id) ON DELETE SET NULL`
- `action text` (1–100), `target_type report_target_type`, `target_id uuid`
- `note text` (≤2000), `created_at timestamptz`

**`public.user_settings`** (`202607190009`)
- `user_id uuid PK → auth.users(id) ON DELETE CASCADE`
- `email_notif|push_notif|inapp_notif boolean DEFAULT true`
- `show_profile boolean DEFAULT true`, `show_email boolean DEFAULT false`
- `theme text` ∈ `light|dark|system` DEFAULT 'system'
- `language text` ∈ `ru|en` DEFAULT 'ru'
- `updated_at timestamptz`

**`public.invites`** (`202607190005`) — закрытая бета, **только через RPC**
- `code text PK`, `created_by uuid → auth.users(id)`
- `used_by uuid → auth.users(id)`, `used_at timestamptz`
- `note text`, `created_at timestamptz`
- `expires_at timestamptz DEFAULT now()+30d`
- индекс `idx_invites_used (used_by) WHERE used_by IS NOT NULL`

### Storage buckets
| Бакет | Public? | Лимит | MIME | Путь |
|---|---|---|---|---|
| `listing-photos` (`202607190002`) | да (read) | 10 МБ | jpeg/png/webp | `listing/{listing_id}/{uuid}.{ext}` |
| `avatars` (`202607190010`) | да (read) | 5 МБ | jpeg/png/webp | `{user_id}` (1 файл, перезапись) |

---

## 2. RLS — матрица изоляции (из `202607190001` + hardening-миграций)

Легенда: ✅ разрешено · ❌ запрещено · 🔓 публично (по дизайну).

| Объект | anon | authenticated | service_role | Ключевая политика |
|---|---|---|---|---|
| `users` | 🔓 SELECT | 🔓 SELECT · ✅ UPDATE своей (`auth.uid()=id`) · ❌ INSERT/DELETE | ✅ всё | «Public profiles are readable», «Users update only their own profile» |
| `listings` | 🔓 SELECT активных (`deleted_at IS NULL`) | 🔓 SELECT · ✅ INSERT (`author_id=auth.uid()`, `status='active'`) · ✅ UPDATE/DELETE своих · ❌ чужие | ✅ всё | «Public sees active listings», «Authors see their own listings», «Users create their own active listings», «Authors update their own listings» |
| `chats` | ❌ | ✅ SELECT участником (`private.is_chat_participant(id)`) · ❌ INSERT (только RPC) · ❌ UPDATE/DELETE | ✅ всё | «Participants read chats» |
| `chat_participants` | ❌ | ✅ SELECT участником · ❌ INSERT (только RPC) · ❌ UPDATE/DELETE | ✅ всё | «Participants read chat membership» |
| `messages` | ❌ | ✅ SELECT участником · ✅ INSERT (`sender_id=auth.uid()` + участник) · ❌ UPDATE/DELETE | ✅ всё | «Participants read messages», «Participants send their own messages» |
| `reports` | ❌ | ✅ INSERT (своя, `status='new'`) · ✅ SELECT только **своей** (`reporter_id=auth.uid()`) · ❌ UPDATE/DELETE/чужие | ✅ всё | «Users read their own reports», «Users create their own reports» |
| `listing_images` | 🔓 SELECT | 🔓 SELECT · ✅ INSERT/DELETE для своих листингов | ✅ всё | «Public reads listing images», «Authors insert/delete their listing images» |
| `storage.listing-photos` | 🔓 public read | ✅ upload/delete только в свою папку (`private.is_listing_author`) | ✅ всё | storage policies `Authors read/upload/delete their listing photos` |
| `storage.avatars` | 🔓 public read | ✅ upload/delete только свой `{user_id}` | ✅ всё | storage policies `Users read/upload/delete own avatar` |
| `moderation_audit` | ❌ | ❌ (REVOKE ALL, без policy) | ✅ INSERT/SELECT | серверная модерация |
| `user_settings` | ❌ | ✅ SELECT/INSERT/UPDATE только `(select auth.uid())=user_id` | ✅ всё | 3 политики на `user_settings` |
| `invites` | ❌ | ❌ (`using(false)` для всех) | ✅ всё | прямой доступ запрещён; только узкие RPC |

**Критические invariant'ы (НЕ нарушать при коде):**
1. Чтение листингов анонимом/всеми = только `status='active' AND deleted_at IS NULL`. Это core-функционал.
2. `author_id`, `status`, `created_at` листинга **неизменяемы пользователем** — защищено триггером `private.prepare_listing_update()` (бросает exception). Код НЕ должен пытаться менять их.
3. `chats` и `chat_participants` — прямой INSERT клиенту **запрещён** (grant только SELECT). Единственный путь создания чата — RPC `open_or_create_chat`.
4. Сообщения: `sender_id` должен совпадать с `auth.uid()`, плюс отправитель должен быть участником чата.
5. `moderation_audit` и `invites` — вне клиента. Клиентский код НЕ должен к ним обращаться напрямую.

---

## 3. RPC-функции (полный инвентарь)

### Клиентские (вызываются из браузера)
| Функция | Сигнатура | Контекст | Grant | Назначение |
|---|---|---|---|---|
| `public.open_or_create_chat` | `(p_listing_id uuid) → uuid` | **SECURITY DEFINER** (намеренно) | `authenticated` | Атомарное создание чата + участников. Проверяет: auth, листинг active+не удалён, автор ≠ инициатор. Возвращает `chat_id`. **Единственный путь создания чата.** |
| `public.listing_cover_path` | `(p_listing_id uuid) → text` | SECURITY DEFINER (читает `listing_images` в обход RLS для публичной ленты) | `anon, authenticated` | Путь первого фото (по `sort_order`, `created_at`). |
| `public.is_invite_valid` | `(p_code text) → boolean` | SECURITY DEFINER | `anon, authenticated` | Проверка: код существует, `used_by IS NULL`, не просрочен. Без раскрытия данных таблицы. |
| `public.invite_status` | `(p_code text) → text` | SECURITY DEFINER | `anon, authenticated` | `'valid'|'used'|'expired'|'not_found'`. |
| `public.claim_invite` | `(p_code text, p_user_id uuid) → boolean` | SECURITY DEFINER | `authenticated` | Помечает инвайт использованным (из Edge Function / вручную). |

> Примечание: миграция `202607190012` временно перевела `is_invite_valid`/
> `invite_status`/`listing_cover_path` в `SECURITY INVOKER`, но `202607200000`
> вернул их в `DEFINER` — потому что таблица `invites` имеет `using(false)`,
> и INVOKER-контекст делал бы функции бесполезными. **Итоговое состояние:
> все 5 клиентских RPC — DEFINER.** Не меняйте обратно на INVOKER без
> пересмотра доступа к `invites`.

### Служебные (private, не для клиента — `REVOKE ALL FROM PUBLIC`)
| Функция | Где | Назначение |
|---|---|---|
| `private.handle_new_user()` | `202607190001` | Триггер `on_auth_user_created`: создаёт профиль `public.users` из `raw_user_meta_data`. |
| `private.prepare_listing_update()` | `202607190001` | Триггер `listings_prepare_update`: блокирует смену `author_id/status/created_at`, управляет `deleted_at`, ставит `updated_at`. |
| `private.is_chat_participant(p_chat_id)` | `202607190001` | Проверка участия в чате (используется RLS). Grant `authenticated`. |
| `private.listing_id_from_path(p_path)` | `202607190002` + hardening `202607190004` | Извлекает `listing_id` из пути storage с валидацией regex. |
| `private.is_listing_author(p_listing_id)` | `202607190002` | Проверка авторства листинга (storage RLS). SECURITY DEFINER. |
| `private.user_id_from_avatar_path(p_path)` | `202607190010` | Извлекает `user_id` из пути `avatars/{user_id}`. |
| `private.enforce_listing_image_limit()` | `202607190004` | Триггер `listing_images_limit`: макс. 10 фото на листинг (бросает `check_violation`). |

### Realtime
- `supabase_realtime` publication включает `public.messages` и `public.chats`
  (добавлено в `202607190004`). RLS на обеих таблицах включён → realtime
  события уважают RLS (участники видят только свои чаты/сообщения).
- Фронтенд использует Supabase Realtime (НЕ polling) для чата.

---

## 4. Связи между фичами (ER-кратко)

```
auth.users ──< users (1:1, PK=auth.id)
users ──< listings (author_id)
users ──< listings (initiator_id → chats)   [через chats.initiator_id]
listings ──< chats (listing_id)
listings ──< listing_images (listing_id)
users ──< chat_participants (user_id) >── chats (chat_id)   [M:N]
users ──< messages (sender_id) >── chats (chat_id)
users ──< reports (reporter_id)              [target_id полиморфный: listing|chat|message]
users ──< moderation_audit (moderator_id)    [target_type/target_id полиморфные]
users ──1 user_settings (user_id, PK)
auth.users ──< invites (created_by, used_by)
storage.listing-photos ── listing_images.path
storage.avatars ── users.avatar_path
```

Ключевые точки интеграции для кода:
- **Лента** = `SELECT listings WHERE status='active' AND deleted_at IS NULL`,
  обогащение обложкой через `listing_cover_path(id)` (RPC).
- **Чат** = `open_or_create_chat(listing_id)` → подписка Realtime на `messages`
  где `chat_id` принадлежит участнику.
- **Профиль** = `users` (публично) + `user_settings` (приватно, своё) +
  `avatars` storage.
- **Фото** = `listing_images` (метаданные) + бакет `listing-photos`
  (файлы, path-валидация через `private.listing_id_from_path`).
- **Модерация** = клиент пишет `reports`; `moderation_audit` пишется только
  service_role (вне фронта).

---

## 5. Типы TypeScript (`src/types/database.ts`)

> **ВАЖНО:** файл помечен как ВРЕМЕННЫЙ (hand-written). Должен быть
> заменён на сгенерированный через Supabase CLI:
> `supabase gen types typescript --project-id uwinrqeyixdnemszhxoj > src/types/database.ts`.
> Текущий файл **рассинхронизирован** с миграциями: в нём есть
> `address/lat/lng/is_mock` (добавлены `202607190007`/`202607200001`), но
> он может не покрывать `user_settings`, `invites`, `telegram_id`,
> `avatar_path`. Перед работой с типами — сгенерировать заново из прод-схемы.

---

## 6. Guardrails для субагентов, пишущих код

1. **Никаких прямых INSERT/UPDATE/DELETE в `chats`, `chat_participants`,
   `messages` от имени клиента** — только через `open_or_create_chat` и
   RLS-разрешённые INSERT в `messages` (`sender_id=auth.uid()`).
2. **Не менять `author_id`, `status`, `created_at` листинга** — триггер
   заблокирует. Для удаления используй soft-delete (`deleted_at=now()`),
   не `DELETE FROM`.
3. **Storage-пути строго по контракту:** `listing/{listing_id}/{uuid}.{ext}`
   и `avatars/{user_id}`. Нарушение → storage RLS отклоняет.
4. **`moderation_audit` и `invites`** — только server/Edge/SQL-консоль.
   Клиент обращается к `invites` исключительно через
   `is_invite_valid` / `invite_status` / `claim_invite`.
5. **Не трогать `search_path` и `SECURITY DEFINER` у 5 клиентских RPC**
   без явного запроса — см. раздел 3.
6. **RLS-изоляция между пользователями** — священна. Любой код должен
   полагаться на `auth.uid()`, а не передавать ID в аргументах функций,
   обходящих RLS.
7. Перед правкой схемы/миграции — new migration file (UTC-префикс),
   НЕ править `supabase/schema.sql` (исторический, read-only) и НЕ править
   существующие миграции накатанного проекта.
8. **Context7 обязателен** (см. `docs/AGENTS.md`) при любом коде под
   Supabase/Postgres/React, синтаксис которого не 100% известен прямо сейчас.

---

## 7. Что НЕ реализовано (задачи вне кода — `docs/out-of-code/`)
- CAPTCHA при регистрации, SMTP-рассылка, 152-ФЗ (перс. данные),
  закрытая бета (invites уже есть, но раздача — вручную оператором).
- Нативный Telegram OAuth не используется — `telegram_id` пишется из
  Edge Function `connect-telegram` после валидации подписи Login Widget.
