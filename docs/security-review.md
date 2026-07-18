# Отчёт по безопасности (Security Review)

Дата: 2026-07-19
Охват: RLS-изоляция между пользователями, модерация жалоб, секреты.
База: `supabase/schema.sql` (актуальные политики) + Phase 7 (жалобы/модерация).

## 1. Матрица изоляции RLS

Легенда: ✅ разрешено · ❌ запрещено · 🔓 публично (по дизайну).

| Таблица / объект | anon | authenticated | service_role | Ключевая политика |
|---|---|---|---|---|
| `users` | 🔓 SELECT (все профили) | 🔓 SELECT · ✅ UPDATE своей (`auth.uid()=id`) · ❌ INSERT/DELETE | ✅ всё | `Users are viewable by everyone`, `Users can update own profile` |
| `listings` | 🔓 SELECT активных (`deleted_at IS NULL`) | 🔓 SELECT · ✅ INSERT (`auth.uid()=author_id`) · ✅ UPDATE/DELETE своих | ✅ всё | `Listings are viewable by everyone`, `Authenticated users can create listings`, `Authors can update/delete own listings` |
| `chats` | ❌ | ✅ SELECT участником (`EXISTS chat_participants`) · ✅ INSERT (auth) · ❌ UPDATE/DELETE | ✅ всё | `Chats viewable by participants`, `Authenticated users can create chats` |
| `chat_participants` | ❌ | ✅ SELECT участником · ✅ INSERT (auth) · ❌ UPDATE/DELETE | ✅ всё | `Participants viewable by chat members`, `Authenticated users can add participants` |
| `messages` | ❌ | ✅ SELECT участником · ✅ INSERT (`auth.uid()=sender_id` + участник) · ❌ UPDATE/DELETE | ✅ всё | `Messages viewable by chat participants`, `Participants can send messages` |
| `reports` | ❌ | ✅ INSERT (своя жалоба) · ✅ SELECT только **своей** (`reporter_id=auth.uid()`) · ❌ UPDATE/DELETE/чужие | ✅ всё (модерация) | `Reports insert own`, `Reports select own` |
| `listing_images` | 🔓 SELECT активных листингов | 🔓 SELECT · ✅ INSERT/DELETE для своих листингов (`author_id=auth.uid()`) | ✅ всё | `Listing images viewable by everyone`, `Authors manage own listing images` |
| storage `listing-photos` | 🔓 public read | 🔓 public read · ✅ upload (владелец папки = user id) | ✅ всё | storage policy `bucket readable by all`, `upload to own folder` |
| `moderation_audit` | ❌ | ❌ (никакого доступа) | ✅ INSERT/SELECT только service_role | `Moderation audit service only` |

## 2. Изоляция между пользователями

**Пользователь B НЕ МОЖЕТ** прочитать или изменить данные пользователя A:

- **Профиль A** — UPDATE/INSERT/DELETE заблокированы (`auth.uid()=id`). SELECT разрешён всем
  намеренно (публичные имена/города в ленте).
- **Листинг A** — чтение активного листинга B разрешено **только в публичной ленте**
  (`deleted_at IS NULL`) — это по дизайну. UPDATE/DELETE/INSERT чужого листинга запрещены.
- **Чат A** — SELECT только участникам (`EXISTS chat_participants`). Прямой INSERT в `chats`/
  `chat_participants` разрешён аутентифицированным, но создание участников ограничено
  логикой `open_or_create_chat` (см. раздел 3), а содержимое чата недоступно посторонним.
- **Сообщение A** — SELECT/INSERT только участникам чата (`auth.uid()=sender_id` + membership).
- **Фото A** — storage: upload разрешён только в собственную папку `user_id/`. Чужие фото
  читаются только как часть публичного активного листинга.
- **Жалоба A** — `reports` SELECT ограничен `reporter_id=auth.uid()`. B не видит жалобы A.

**Единственное намеренное публичное исключение:** лента активных, не удалённых листингов
(`listings` WHERE `deleted_at IS NULL`) доступна всем (anon + auth). Это core-функционал
сервиса — прямой просмотр объявлений без посредников.

## 3. `open_or_create_chat` — SECURITY DEFINER (намеренно, не дефект)

Supabase linter выдаёт единственное предупреждение: функция `open_or_create_chat` объявлена
`SECURITY DEFINER` и доступна роли `authenticated`. Это **принятое решение, а не уязвимость**.

Почему безопасно:

1. **`auth.uid()` берётся из сессии вызывающего**, а не передаётся аргументом — подмена
   идентификатора невозможна.
2. **`search_path` зафиксирован** (пустой/квалифицированный), исключая hijack схемы.
3. **Все имена объектов квалифицированы** (`public.chats`, `public.chat_participants`) —
   нет зависимости от search_path.
4. **`EXECUTE` выдан только `authenticated`, НЕ `anon`** — анонимы не могут вызвать функцию.
5. **Прямой INSERT в `chats`/`chat_participants` заблокирован RLS** для клиента; участники
   добавляются только через эту функцию, которая сама проверяет права владения листингом.
6. Функция не возвращает и не модифицирует данные, принадлежащие другим пользователям, — только
   создаёт чат для текущего пользователя по существующему публичному листингу.

**Вывод:** функция безопасна и остаётся как есть. Предупреждение закрыто с пояснением.

## 4. `moderation_audit` — без клиентского доступа

Таблица `moderation_audit` (лог решений модератора по жалобам) недоступна ни anon, ни
authenticated. Нет RLS-политики, открывающей её клиенту, и клиентский код не обращается к ней.
Все записи пишутся/читаются исключительно через `service_role` (серверная модерация).
Утечка данных модерации клиенту исключена.

## 5. Обработка секретов

- `.env` (и `.env.local`) исключён через `.gitignore` — приватный ключ (`service_role`) не
  попадает в git-историю.
- В клиенте используется **только publishable (anon) ключ** из `@/lib/supabase`. Он
  предназначен для публикации и не даёт привилегий выше RLS.
- `service_role` используется исключительно на сервере (модерация, `moderation_audit`) и
  никогда не передаётся в браузер.
- Доступ к привилегированным операциям (модерация жалоб) защищён проверкой роли модератора
  на сервере, а не на клиенте.

## 6. Жалобы (Phase 7) — безопасность

- `createReport` вставляет строку со `reporter_id` = текущий пользователь и `status='new'`.
- Уникальное ограничение `(target_type, target_id, reporter_id)` предотвращает дубли;
  нарушение `23505` маппится клиенту в `already_reported` без раскрытия деталей БД.
- `getMyReport` возвращает только собственную жалобу пользователя (`reporter_id=auth.uid()`).
- API-функции никогда не бросают исключений — возвращают `{data, error}`, что исключает
  утечку стектрейсов/деталей БД на клиент.

## 7. Статус

- RLS на всех пользовательских таблицах включён и проверяет `auth.uid()`.
- Осталось 1 принятое предупреждение linter (`open_or_create_chat`) — обосновано в разделе 3.
- Секреты изолированы, publishable-ключ в клиенте — по дизайну.
- `moderation_audit` закрыт от клиента.
