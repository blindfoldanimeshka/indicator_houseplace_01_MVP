# Социальные подключения (реальная OAuth-интеграция)

> Документация по разработке раздела «Подключения» профиля с **реальной**
> привязкой аккаунтов через провайдеров. Заменяет текущие UI-заглушки
> (`ConnectionsTab` / `ConnectedService`), которые держат статус только в
> локальном `useState`.

Проект: `напрямую` (аренда жилья без посредников). Стек: React 19 + Vite +
TypeScript + Tailwind 4, Supabase (Auth/Postgres/Storage/Realtime).

---

## 1. Контекст и текущее состояние

- `src/features/profile/components/ConnectionsTab.tsx` — список сервисов
  (`google`, `apple`, `yandex`, `vk`, `telegram`) с локальным стейтом.
- `src/features/profile/components/ConnectedService.tsx` — строка сервиса,
  кнопка «Подключить» меняет только локальный стейт.
- `src/features/profile/types/profile.types.ts` — `interface ConnectedService { id; name; status }`.
- Логин сейчас только `email + password`
  (`AuthProvider.signIn` → `signInWithPassword`). OAuth в проекте отсутствует.
- Supabase-проект `MVP-House` (ref `uwinrqeyixdnemszhxoj`, `eu-north-1`).
  URL в `.env`: `VITE_SUPABASE_URL`. Ключи: `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Supabase CLI локально **не установлен** — миграции накатываются через
  MCP `apply_migration` на remote-проект (см. `supabase/migrations/README.md`).
  Генерация типов `Database` делается вручную в `src/types/database.ts`.

**Цель:** сервисы в «Подключениях» отражают реально привязанные OAuth-идентичности
пользователя, и пользователь может как привязывать их к текущему аккаунту
(link), так и видеть/отвязывать.

---

## 2. Возможности провайдеров в Supabase Auth

Supabase Auth нативно поддерживает OAuth для: `google`, `apple`, `yandex`,
`vk`, `azure`, `facebook`, и др. (полный список — в дашборде Auth → Providers).
Для каждого нужны **Client ID + Secret**, выданные в консоли провайдера, и
настроенный **redirect URI** вида
`https://uwinrqeyixdnemszhxoj.supabase.co/auth/v1/callback`.

| Провайдер | Нативный OAuth в Supabase | Особенности |
|---|---|---|
| Google | ✅ | стандарт OIDC; scope `openid email profile` |
| Apple | ✅ | нужен Apple Developer аккаунт ($99/год); Service ID, key |
| Yandex | ✅ | OAuth2; scope `login:email login:avatar` |
| VK | ✅ | OAuth2 (VK ID); scope `email`; нужен VK App |
| Telegram | ❌ (нет native) | отдельный флоу: Telegram Login Widget / bot + Edge Function |

### Авто-линковка (важно)
Supabase Auth при входе через OAuth с верифицированным email **автоматически
линкует** идентичность к существующему аккаунту с тем же email
(`DetermineAccountLinking` учитывает только `Verified=true`). Это поведение
настраивается в Auth → Providers → «Auto confirm user emails» / link policy.

В нашем случае (закрытая бета с инвайтами) email уже подтверждён при
регистрации, поэтому линковка по email будет работать «из коробки» при входе.

### Telegram — не нативный
Supabase не имеет Telegram как OAuth-провайдера. Реализуем через
**Telegram Login Widget** (`https://telegram.org/js/telegram-widget.js`):
виджет вызывает callback с подписью `{ id, first_name, username, photo_url, auth_date, hash }`.
Валидируем `hash` на стороне **Edge Function** (`verifyTelegramLogin`):
`hash = hex(HMAC_SHA256(bot_token, check_string))`, где `check_string` —
отсортированные `key=value` без `hash`. Если валидно — вызываем
`supabase.auth.admin.linkIdentity` или создаём сессию через
`signInWithIdToken`/custom token. Для MVP достаточно: проверить подпись в
Edge Function и записать `telegram_id` в профиль пользователя
(см. раздел 5), т.к. полноценная сессия Telegram в SPA сложнее и не нужна
для «подключения».

---

## 3. Архитектура решения

### 3.1 Способы привязки
1. **Link to existing session** (рекомендуемый для «Подключений»):
   пользователь уже залогинен по email. Нажимает «Подключить Google» →
   редирект на OAuth провайдера с `redirectTo` обратно в приложение. После
   колбэка Supabase привязывает identity к текущему `auth.users`.
   - Для этого используется endpoint линковки: с SPA вызываем
     `supabase.auth.linkIdentity({ provider })` (он сам делает редирект на
     `/user/identities/authorize?provider=...`). После возврата identity
     появляется в `auth.users.identities`.
2. **Sign in / up with OAuth** (альтернатива на экране входа):
   `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`.
   Создаёт/линкует аккаунт и сразу логинит.

Для раздела профиля используем **вариант 1 (`linkIdentity`)** — это и есть
семантика «Подключить сервис к моему аккаунту».

### 3.2 Источник правды о статусах
Статус «подключено» определяем из `auth.users.identities` (таблица
`auth.identities`, доступна клиенту через `supabase.auth.getUser()` →
`user.identities`, либо `supabase.auth.getSession()`). Для Telegram (не
нативный) — из колонки `telegram_id` в `public.users`.

> Не храним дублирующий список в `public.users` для нативных провайдеров —
> это рассинхронизирует состояние. Читаем identities как источник правды,
> UI просто мапит `provider` → наше имя сервиса.

### 3.3 Где берём список identities на клиенте
```ts
const { data } = await supabase.auth.getUser()
const linked = new Set((data.user?.identities ?? []).map((i) => i.provider))
// linked.has('google') === true → Google подключён
```
Для отвязки нативного провайдера:
```ts
await supabase.auth.unlinkIdentity(identityId) // identityId из identities[].id
```
⚠️ Последний провайдер отвязать нельзя, если нет пароля/другого способа
входа — Supabase вернёт ошибку; UI должен её показать.

---

## 4. Схема БД и миграции

### 4.1 Нативные провайдеры
Не требуют таблиц — данные в `auth.identities`. RLS на `auth.*` клиенту
недоступна напрямую, но `supabase.auth.*` SDK читает корректно под сессией
пользователя.

### 4.2 Telegram (кастомный)
Миграция: добавить колонку в `public.users`.
```sql
-- supabase/migrations/YYYYMMDDNNN_user_telegram.sql
alter table public.users
  add column if not exists telegram_id text unique;
```
RLS на `users` уже есть (чтение все, апдейт только свой). Запись
`telegram_id` происходит из Edge Function (service_role) после валидации
подписи.

### 4.3 Миграция статусов (опционально, для быстрого UI)
Если хотим кэшировать «подключено/не подключено» в `public.users` ради
быстрого рендера без лишнего `getUser()`, можно завести `jsonb
connected_providers` — НО это дублирует `auth.identities`. В MVP **не
делаем**, читаем identities напрямую (их мало, запрос лёгкий).

---

## 5. Edge Function: Telegram

`supabase/functions/connect-telegram/index.ts`
- Принимает POST `{ id, first_name, username, photo_url, auth_date, hash }`.
- Проверяет `hash` через HMAC_SHA256(`bot_token`, `check_string`), где
  `check_string` = отсортированные `key=value` всех полей кроме `hash`.
- Проверяет `auth_date` не старше 5 минут (replay-защита).
- Берёт JWT из `Authorization` заголовка, резолвит `auth.uid()`.
- `supabase.from('users').update({ telegram_id: id }).eq('id', uid)`.
- Возвращает `{ ok: true }` / `{ ok: false, error }`.
- Deploy через MCP `deploy_edge_function` (verify_jwt = true, т.к. нужен
  текущий пользователь). `bot_token` — через Supabase Secrets
  (`Deno.env.get('TELEGRAM_BOT_TOKEN')`), НЕ в коде.

> Telegram Login Widget на клиенте: `<script src="https://telegram.org/js/telegram-widget.js?22"></script>`
> с `data-telegram-login="<bot_username>"` `data-onauth="onTelegramAuth(user)"`
> `data-request-access="write"`. В React удобнее подключить скрипт
> динамически и повесить `window.onTelegramAuth`.

---

## 6. План реализации (атомарные шаги)

1. **Документация** — этот файл.
2. **Backend-конфиг (вне кода, пользователь):** в Supabase Dashboard →
   Auth → Providers включить Google, Apple, Yandex, VK, задать Client
   ID/Secret и redirect URI. Создать Telegram-бота, получить токен,
   задать Secrets. *Это делает пользователь — агент не может.*
3. **`useConnections` hook** (`src/features/profile/useConnections.ts`):
   - `load()` — `supabase.auth.getUser()`, маппит identities + `users.telegram_id`
     в наш тип `ConnectionStatus[]`.
   - `link(provider)` — для нативных: `supabase.auth.linkIdentity({ provider })`
     (редирект). Для telegram — открывает виджет, шлёт в Edge Function.
   - `unlink(provider)` — для нативных: `unlinkIdentity`. Для telegram:
     `update({ telegram_id: null })`.
   - Состояния: `loading`, `connecting`, `error`.
4. **Переписать `ConnectionsTab`** — использовать `useConnections` вместо
   локального стейта; кнопка «Подключить» → `link`, у подключённых —
   кнопка «Отвязать» → `unlink` (с ConfirmDialog).
5. **`ConnectedService`** — добавить `onUnlink`, иконки провайдеров
   (lucide: `Mail`/`Apple`/`...`; для Yandex/VK/Telegram — кастомные SVG или
   `Globe` заглушка с меткой).
6. **Telegram-виджет** — компонент `TelegramConnect` (динамический скрипт +
   вызов Edge Function). Интегрировать в `ConnectionsTab`.
7. **Миграция** `user_telegram.sql` (через MCP) + тип `Database` (`users.telegram_id`).
8. **Edge Function** `connect-telegram` (deploy через MCP) + секрет
   `TELEGRAM_BOT_TOKEN` (пользователь).
9. **Тесты:** `useConnections` (мок `supabase.auth`), `ConnectionsTab`
   (link/unlink вызывают нужные методы), Telegram-валидация (через мок
   fetch к Edge Function).
10. **Env:** добавить `VITE_TELEGRAM_BOT_USERNAME` (публичный, для виджета).
11. **Lint / typecheck / полный тест-сьют** + коммит + пуш.

---

## 7. Обработка ошибок и UX

- `linkIdentity` делает редирект страницы — это не async-вызов «в фоне».
  Поэтому кнопка «Подключить» просто триггерит редирект; возврат идёт по
  `redirectTo` (тот же профиль). После возврата `useConnections.load()`
  покажет новый статус.
- Если пользователь отменяет OAuth — возврат без новой identity; статус не
  меняется.
- Ошибка отвязки последнего способна входа — показываем
  «Оставьте хотя бы один способ входа».
- Telegram: при ошибке валидации подписи Edge Function вернёт `ok:false` —
  показываем сообщение, не меняем статус.

---

## 8. Риски и открытые вопросы

| Риск | Митигация |
|---|---|
| Провайдеры не включены в дашборде | Пользователь включает + даёт Client ID/Secret (вне кода) |
| Telegram Login Widget требует публичный домен для валидации | Работает на любом origin, но `auth_date` replay-window — 5 мин |
| `linkIdentity` редиректит страницу (SPA-навигация сбрасывается) | `redirectTo` ведёт точно в `/` + профиль; состояние не теряется (AuthProvider восстанавливает сессию) |
| Нет Supabase CLI локально | Миграции/деплой через MCP; типы `Database` — руками |
| Apple требует платный Developer аккаунт | Возможно отложить Apple до получения аккаунта |

---

## 9. Проверка (definition of done)

- [ ] Google/Apple/Yandex/VK привязываются и отображаются как подключённые
      (статус из `auth.identities`).
- [ ] Telegram привязывается через виджет + Edge Function, `telegram_id`
      пишется в `public.users`.
- [ ] Отвязка работает для всех, с защитой от удаления последнего способа
      входа.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` — зелёные.
- [ ] Миграция и (для Telegram) Edge Function задеплоены на проект.
- [ ] Провайдеры включены в Supabase Dashboard (вне кода).
