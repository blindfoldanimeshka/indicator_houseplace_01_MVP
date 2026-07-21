# План устранения проблем качества и безопасности — проект «напрямую»

- **Дата:** 2026-07-21
- **Автор:** оркестратор Sisyphus + команда ревьюеров (2 × security, 2 × QA), запущенных параллельно
- **Охват:** весь репозиторий `C:\Users\blindfold\Desktop\oiii pizdec\2026\sobs` (React 19 + Vite + TypeScript + Supabase SPA)
- **Статус:** план (исправления НЕ внесены; это документ для согласования и последующей реализации)

---

## 1. Введение и методология

Перед формированием любых решений были изучены актуальные источники (согласно требованию проекта и AGENTS.md — Context7 обязателен для работы с библиотеками):

- **Context7** — извлечены актуальные доки: `/supabase/supabase` (RLS/auth/storage), `/reactjs/react.dev` (React 19 XSS/security), `/vitejs/vite` (env/CSP).
- **Websearch (Exa)** — «Supabase RLS common mistakes 2026», «SPA security XSS CSP 2026», «Supabase anon vs service_role key exposure», «Supabase publishable/secret key migration», «React dangerouslySetInnerHTML DOMPurify», «Vite security headers CSP».

Затем параллельно отработали 4 независимых ревьюера (только чтение, без правок):

1. **Security — data layer** (Supabase: RLS, ключи, storage, RPC) — `bg_ec642a8a`.
2. **Security — app/React layer** (XSS, секреты в бандле, CSP, токены, зависимости) — `bg_b3068c8f`.
3. **QA — test coverage** — `bg_efd73dfc`.
4. **QA — code quality / robustness** — `bg_5e4a1c67`.

Каждый отчёт сверял фактический код с документацией проекта (`docs/security-review.md`, `docs/backend-analysis.md`, `docs/db.md`) и с актуальными best practices.

**Как читать документ:** находки разбиты по зонам. Для каждой — `severity` (Critical/High/Medium/Low), место (`file:line`), влияние и конкретная ремедиация. В разделе 7 — приоритизированный roadmap с проверкой.

---

## 2. Сводная таблица рисков

| # | Зона | Находка | Severity |
|---|------|---------|----------|
| S1 | Data | `docs/security-review.md` и `backend-analysis.md` **устарели** — не покрывают миграции `f1`–`f12` (orgs, billing, reviews, notifications, verifications, attachments, …) | High |
| S2 | Data | `subscriptions`: клиенту разрешён `INSERT` со `WITH CHECK (user_id=auth.uid())` → обход оплаты (сам себе выписывает active-подписку) | High |
| S3 | Data | `organization_members`: политика разрешает **любому участнику** менять/удалять любые записи, включая повышение себя до `owner` | High |
| S4 | Data | `claim_invite` выдан `authenticated` и **не проверяет** `p_user_id = auth.uid()` → любой может «сжечь» чужие инвайты | Medium |
| S5 | Data | Storage-бакет `message-attachments` **отсутствует в миграциях**, storage-RLS для него нет → требует проверки в дашборде | Medium |
| S6 | Data | `user_settings` имеет RLS, но **нет GRANT** authenticated → таблица недоступна клиенту (сломано, но безопасно) | Medium |
| S7 | Data | Mock-аккаунты в `auth.users` с известным паролем `mockpass123` (seed-миграция) | Medium |
| S8 | Data | `users.rating` не существует, но `create_review` делает `UPDATE ... SET rating` → рейтинг сломан | Low |
| S9 | Data | RPC `listing_cover_path` / `is_invite_valid` / др. — `SECURITY DEFINER` с `search_path = public` (лучше `''`) | Low |
| A1 | App | **Полностью отсутствует Content-Security-Policy** (ни заголовок, ни meta) | Critical |
| A2 | App | Отсутствуют `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Strict-Transport-Security` | High |
| A3 | App | Supabase-сессия в `localStorage` (дефолт) → кража токена при любом XSS | Medium |
| A4 | App | Нет SCA в CI (`npm audit`/Dependabot/Snyk отсутствуют) | Medium |
| A5 | App | `sourcemap` в прод-сборке включён по умолчанию → исходники раскрыты | Low |
| A6 | App | `attachment_path` в `Thread.tsx` рендерится в `href`/`src` без проверки схемы URL | Low |
| Q1 | Code | Пустые `catch (() => {})` в `chatApi.ts` (dispatchNotifications) — ошибки доставки уведомлений невидимы | High |
| Q2 | Code | `AuthProvider.claim_invite` — результат RPC **игнорируется** (пользователь думает, что зарегался) | High |
| Q3 | Code | Нет фокус-менеджмента при смене экранов через `AnimatePresence` (a11y) | High |
| Q4 | Code | `App.toggleNotifications` делает `push('chats')` → возможны дублирующиеся записи в стеке | Medium |
| Q5 | Code | `Feed.tsx` — двойной controlled/uncontrolled state (хрупко) | Medium |
| Q6 | Code | Повсеместные `as`/`as never` приведения после Supabase (обход типобезопасности) | Medium |
| Q7 | Code | Prop-drilling состояния уведомлений через 2–3 уровня | Low |
| T1 | Test | `tests/features/profile/ProfilePage.test.tsx` — 4 падающих теста (нет `NavigationProvider`) | High |
| T2 | Test | `.skill-tmp/cli/tests/e2e/preview.spec.ts` ломает каждый прогон CI (`@playwright/test` не установлен) | High |
| T3 | Test | `ListingDetail.tsx` и `ListingForm.tsx` — **ноль тестов** (критические пути) | High |
| T4 | Test | **RLS покрытие = 0%** — все API-тесты полностью мокают Supabase, политики не проверяются | High |
| T5 | Test | `App.test.tsx` слабый (только заголовок; нет пути «не авторизован → AuthScreen») | Medium |
| T6 | Test | Пропущены крайние случаи: not-found, RLS-отказ (42501), network failure, attachment send/review | Medium |
| T7 | Test | OOM воркера при `npm test`; два паттерна моков (`vi.mock` vs `vi.doMock`) | Low |

---

## 3. Безопасность: уровень данных (Supabase / RLS / ключи / storage)

### 3.1 Актуальность документации — S1 (High)

**Находка.** `docs/security-review.md` (дата 2026-07-19) и `docs/backend-analysis.md` описывают RLS-матрицу и инвентарь RPC, но **не покрывают миграции `2026072010xx_f1`–`f12`** (organizations, billing, promo, reviews, notifications, verifications, attachments, templates, chat_status, funnel, listing_stats, listing_limit). Ревьюер обнаружил в `supabase/migrations/` 30 файлов против ~16, описанных в `backend-analysis.md`. Существующий отчёт создаёт **ложное чувство безопасности**: таблицы `subscriptions`, `organization_members`, `notifications`, `reviews`, `verifications` и др. вообще не проанализированы в документе.

**Влияние.** Решения по безопасности принимаются на основе неполной картины.

**Ремедиация.**
1. Переписать `docs/backend-analysis.md` и `docs/security-review.md` под полный набор миграций (актуальная RLS-матрица по всем 30 файлам).
2. Добавить в CI проверку: каждая новая миграция, создающая таблицу в `public`, обязана содержать `enable row level security` + хотя бы одну политику (см. S2/S3).
3. Источник авторитета: websearch-обзор «Supabase RLS 2026» — *«каждая таблица в public schema обязана иметь RLS; линтер `rls_disabled_in_public` (ERROR) ловит отсутствие RLS»*.

### 3.2 Назначение прав (GRANT) — S6 (Medium)

**Находка.** `202607190009_user_settings.sql` создаёт политики RLS, но **не делает `GRANT` роли `authenticated`**. По умолчанию в Postgres/Supabase таблица доступна только владельцу (postgres/service_role), поэтому клиент с publishable-ключом не может читать/писать `user_settings` → фича настроек сломана (номинально безопасно, но неработает). Аналогично требует проверки: есть ли GRANT у остальных новых таблиц (`notification_prefs`, `subscriptions`, `reviews`, `organizations`, …).

**Ремедиация.**
```sql
grant select, insert, update on table public.user_settings to authenticated;
```
И проверить/добавить GRANT для всех таблиц, к которым должен ходить клиент. Не забывать про `revoke` там, где клиенту доступ не нужен (см. S2).

### 3.3 RLS-политики: критические дефекты

#### S2 — `subscriptions`: обход оплаты (High)

**Место.** `202607201040_f2_billing_schema.sql` — `grant insert, select, update on public.subscriptions to authenticated;` + политика `FOR ALL USING/WITH CHECK (user_id = auth.uid())`.

**Проблема.** Клиент может сам вставить строку `subscriptions (user_id=<свой>, plan_id=<платный>, status='active')`. Политика проверяет только владельца строки, а не факт оплаты. → **бесплатный доступ к платным тарифам**.

**Ремедиация.** Запретить клиенту писать подписки; пусть их создаёт/обновляет только `service_role` (webhook платёжной системы):
```sql
revoke insert, update on public.subscriptions from authenticated;
-- оставить authenticated только select своих подписок:
-- policy FOR SELECT USING (user_id = (select auth.uid()))
```
Источник: websearch «Supabase service_role never in client» — *service_role обходит RLS; записи о подписках/платежах должен создавать только серверный код (webhook), никогда клиент.*

#### S3 — `organization_members`: повышение привилегий внутри организации (High)

**Место.** Политика «Members manageable by owner/admin» `FOR ALL USING (private.is_member_of(org_id)) WITH CHECK (private.is_member_of(org_id))`.

**Проблема.** Проверяется только *членство*, но не роль. Любой участник (`role='member'`) может `UPDATE`/`DELETE` любой записи `organization_members` в своей org, в т.ч. назначить себе `role='owner'` или удалить владельца. → приватилегия.

**Ремедиация.** Ограничить управление участниками владельцем/админом:
```sql
create policy "Org owners/admins manage members" on public.organization_members
  for all to authenticated
  using  (private.is_member_of(org_id) and private.member_role(org_id) in ('owner','admin'))
  with check (private.is_member_of(org_id) and private.member_role(org_id) in ('owner','admin'));
```
Источник: Context7/Supabase — *«USING фильтрует строки, WITH CHECK валидирует новое состояние; для UPDATE нужны оба, иначе пользователь может переписать роль/владельца»*.

#### S4 — `claim_invite`: сжигание чужих инвайтов (Medium)

**Место.** `202607200000_fix_invite_rpc_access.sql` выдал `grant execute on function public.claim_invite(text, uuid) to authenticated;` (ранее был только `service_role`). Функция `SECURITY DEFINER` ставит `used_by = p_user_id` **без проверки** `p_user_id = auth.uid()`.

**Проблема.** Любой авторизованный пользователь может пометить любой инвайт-код как использованный произвольным `user_id` (отказ в обслуживании для закрытой беты).

**Ремедиация.** Либо отозвать `execute` у `authenticated` (вызывать только из Edge Function / service_role), либо добавить проверку:
```sql
-- внутри claim_invite, когда вызван не service_role:
if current_user <> 'service_role' and p_user_id <> (select auth.uid()) then
  raise exception 'forbidden';
end if;
```

#### Дополнительно (Low) — S9, S8

- **S9.** RPC `listing_cover_path`, `is_invite_valid`, `invite_status` объявлены `SECURITY DEFINER SET search_path = public`. Лучшая практика — `SET search_path = ''` + полная квалификация имён (защита от search-path hijack). Источник: Context7/Supabase security-адвайзоры — *«все имена объектов квалифицированы; search_path пуст или квалифицирован»*.
- **S8.** `f8_reviews.create_review` делает `UPDATE public.users u SET rating = ...`, но колонки `users.rating` **нет ни в одной миграции** (grep по `migrations/` не нашёл `rating`). Функция упадёт в рантайме → агрегация рейтинга сломана. Ремедиация: добавить колонку `rating numeric` в `users` либо считать рейтинг представлением.
- **`chats` UPDATE-политика** (`f11_chat_status`) разрешает участнику менять **все** колонки чата, а не только `status`/`closed_at` → участник может переписать `listing_id`/`initiator_id`. Сузить до нужных колонок.
- **`user_settings` UPDATE-политика** не имеет `WITH CHECK` — добавить.

### 3.4 Storage — S5 (Medium)

**Находка.** Миграция `f10_attachments` ссылается на бакет `message-attachments`, «созданный в предыдущих миграциях», но **grep по всем миграциям не нашёл ни создания бакета, ни storage-политик для него** (есть только `listing-photos` и `avatars`). Клиентский `storage.ts` тоже знает только эти два бакета — кода загрузки в `message-attachments` нет.

**Влияние.** Если бакет создан вручную в дашборде без storage-RLS, будущая загрузка может оказаться доступной всем на запись.

**Ремедиация.**
1. Проверить наличие бакета и его политик в Supabase Dashboard (security advisor).
2. Если бакета нет — создать его и storage-политики в миграции (не вручную):
```sql
insert into storage.buckets (id, name, public) values ('message-attachments','message-attachments', false);
-- storage-политики: upload только в собственную папку <user_id>/, read участникам чата
```
3. Если фича аттачей ещё не реализована в клиенте — временно не создавать бакет (не плодить мёртвые объекты).

### 3.5 Ключи — подтверждено OK, но план миграции

**Находка (позитивная).** `src/lib/supabase.ts` и `src/lib/env.ts` используют **только** `VITE_SUPABASE_PUBLISHABLE_KEY`; `service_role`/секретный ключ **нигде в клиенте не фигурирует**. Storage-хелпер `storage.ts` тоже без secret-ключа. Это корректно.

**Ремедиация (проактивно).** Согласно Context7/Supabase «Migrating to publishable and secret API keys» (2026): проект всё ещё на legacy `anon`/`service_role`. Рекомендуется перейти на `sb_publishable_…`/`sb_secret_…` (мгновенный отзыв, аудит, асимметричные JWT). Secret-ключи запрещают использование в браузере (HTTP 401). Не блокирует релиз, но внести в roadmap.

### 3.6 Данные — S7 (Medium)

**Находка.** Seed-миграция `202607200002_seed_mock_listings.sql` создаёт записи в `auth.users` с `encrypted_password = crypt('mockpass123', gen_salt('bf'))` (известный пароль) для mock-авторов.

**Влияние.** Если в проекте **выключено подтверждение email**, эти аккаунты можно использовать для входа с известным паролем.

**Ремедиация.**
- Убедиться, что `email confirmations` включены (тогда вход заблокирован без подтверждения).
- Либо поставить этим строкам `is_anonymous=true` / `encrypted_password=null` и гарантировать невозможность логина; пароль сделать случайным/пустым.
- Никогда не использовать общие/известные пароли даже для тестовых данных в прод-базе.

### 3.7 Методология проверки RLS (для будущих миграций)

Из websearch-обзоров «Veriploy / SecureStartKit / Supabase RLS 2026»:
- Включить RLS на **каждой** таблице в `public`; проверять линтер `rls_disabled_in_public` (ERROR).
- Для каждой операции — своя политика; на `INSERT`/`UPDATE` обязателен `WITH CHECK`.
- `auth.uid()` оборачивать как `(select auth.uid())` (initPlan, ~95% ускорение на больших таблицах).
- Индексировать колонки, используемые в политиках (`create index on … (user_id)`).
- `FORCE ROW LEVEL SECURITY` там, где важно применять RLS и к владельцу таблицы.
- **Тестировать через реальный клиент/имперсонацию**, а не SQL Editor (он обходит RLS). IDOR-тест: user A пытается прочитать запись user B по ID → должен получить отказ.

---

## 4. Безопасность: клиент / приложение (React / SPA)

### 4.1 Отсутствие CSP — A1 (Critical)

**Находка.** Ни в `vite.config.ts`, ни в `index.html`, ни в Edge Functions нет `Content-Security-Policy`. Нет `html.cspNonce`, нет плагина CSP.

**Влияние.** Любой XSS (даже случайный) исполняет произвольный JS. Нет защиты от clickjacking, MIME-sniffing. OWASP и websearch «SPA Security 2026» единогласно: строгий nonce-based CSP — последний рубеж против XSS.

**Ремедиация (конкретно).**
1. Для статического SPA (текущая архитектура) задать заголовок на уровне хостинга/CDN (Netlify/Vercel/Cloudflare) или reverse-proxy:
```
Content-Security-Policy: default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.supabase.co;
  font-src 'self';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-maps.yandex.ru https://geocode-maps.yandex.ru;
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```
2. Начать в режиме `Content-Security-Policy-Report-Only`, проверить, затем включить enforce.
3. В dev (Vite HMR) нужен отдельный пермиссивный CSP (`'unsafe-inline'` + `ws:`).
4. Источник: Context7/Vite — CSP задаётся на уровне хоста; для инлайн-скриптов использовать nonce (React в проде генерирует статику, `unsafe-inline` для скриптов не нужен; для CSS-in-JS — возможно нужен).

### 4.2 Security headers — A2 (High)

Добавить на том же уровне хостинга:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin   # уже есть в index.html как meta
```
Источник: websearch «React Security Best Practices 2026» / «OWASP client-side» — frame-ancestors 'none' убирает clickjacking; nosniff блокирует MIME-sniffing.

### 4.3 Token storage — A3 (Medium)

**Находка.** `@supabase/supabase-js` по умолчанию хранит сессию (JWT) в `localStorage` (`AuthProvider.tsx`). При любом XSS токен читается и эксфильтрируется → полный account takeover.

**Ремедиация.**
- *Краткосрочно:* укоротить lifetime токена + включить ротацию refresh + (главное) задеплоить CSP (A1) — строгий CSP не даст XSS украсть токен.
- *Долгосрочно:* BFF-паттерн — сессия хранится сервером, браузеру выдаётся `HttpOnly`+`Secure`+`SameSite=Strict` cookie. Убирает JWT из досягаемости JS.
- Источник: websearch «SPA token storage 2026» — *localStorage читается любым JS на странице; HttpOnly cookie — предпочтительный вариант; если токен в JS — считайте XSS-защиту фундаментом.*

### 4.4 XSS-потенциал — A6 (Low)

Прямых `dangerouslySetInnerHTML`/`eval`/`innerHTML` в `src/**` **не найдено** — вся пользовательская строка рендерится через JSX (авто-эскейпинг React). Единственный нюанс: `Thread.tsx` рендерит `message.attachment_path` в `href`/`src`. Значение формируется `crypto.randomUUID()` на upload, но на всякий случай добавить allowlist схем (`https://…supabase…` / начинается с `/`) перед рендером. Источник: Context7/React — *«React не санитизирует URL-схемы; javascript: в href исполняется»*.

### 4.5 Секреты в бандле — OK

В клиент попадают только `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, опционально `VITE_YANDEX_MAPS_KEY` и `VITE_TELEGRAM_BOT_USERNAME` — всё по дизайну (publishable/публичные). `service_role` отсутствует. Yandex-ключ рекомендуется ограничить в консоли Яндекса по HTTP-referrer и используемым API.

### 4.6 Зависимости — A4 (Medium)

Нет SCA в CI: нет `npm audit` в скриптах, нет Dependabot/Snyk. Версии зависимостей актуальные (React 19.2, Vite 8.1, supabase-js 2.110, zod 4.4), но 2025 показал атаки на цепочку поставок (Shai-Hulud worm, компрометация `chalk`/`debug`).

**Ремедиация.**
```json
"scripts": { "prebuild": "npm audit --audit-level=high" }
```
Добавить `.github/dependabot.yml` (еженедельные security-обновления). Источник: websearch «SPA dependency SCA 2026».

### 4.7 Source maps — A5 (Low)

`vite.config.ts` не задаёт `build.sourcemap: false` → в проде генерируются карты, раскрывающие исходники. Поставить `build: { sourcemap: false }` (или `'hidden'` для error-reporting без привязки в HTML).

---

## 5. Качество кода и робастность

### 5.1 Пустые catch — Q1 (High)

**Место.** `src/features/chat/chatApi.ts:30,110,192` — `void dispatchNotifications().catch(() => {})`. Ошибки доставки Telegram/email-уведомлений молча глотаются.

**Ремедиация.** ` .catch((e) => console.warn('notify dispatch failed', e))` (или отправка в мониторинг).

### 5.2 Игнорируемая ошибка claim_invite — Q2 (High)

**Место.** `src/features/auth/AuthProvider.tsx:82-86` — `claim_invite` вызывается, но его `error` не проверяется; `signUp` возвращает `{ error: null }` даже при сбое RPC.

**Ремедиация.** Захватить результат и вернуть ошибку: `const { error: claimErr } = await claimInvite(...); if (claimErr) return { error: claimErr.message }`.

### 5.3 Фокус-менеджмент — Q3 (High, a11y)

**Место.** `src/app/App.tsx` (экраны в `AnimatePresence`) — при смене экрана фокус не переносится. Клавиатурные/скринридер-пользователи теряют контекст.

**Ремедиация.** Хук `useFocusOnMount(ref)`, фокирующий заголовок/контейнер экрана при маунте. Источник: базовые a11y-практики (ARIA `role="alert"` для ошибок, `aria-hidden` на декоративных стрелках «← Назад»).

### 5.4 Дублирующиеся записи стека — Q4 (Medium)

**Место.** `App.toggleNotifications` → `if (current.view !== 'chats') push('chats')`. Из другого view может накопить несколько `chats`-записей.

**Ремедиация.** Использовать `replace('chats')` либо проверять весь стек на существующую запись `chats`.

### 5.5 Двойной state в Feed — Q5 (Medium)

**Место.** `src/features/listings/Feed.tsx:42-50` — внутренний `useState` как fallback при незаданных props → две ветки управления состоянием, хрупко.

**Ремедиация.** Выбрать один паттерн: либо полностью controlled (props обязательны), либо полностью uncontrolled (внутренний state). Не смешивать.

### 5.6 Универсальные `as`-приведения — Q6 (Medium)

**Место.** По всему `src/features/**/api.ts` — `(data as never)`, `(data as {id:string})`, `row as PhotoRow` и т.п. Обходят типобезопасность.

**Ремедиация.** Использовать generics `supabase` (`createClient<Database>()` уже передаётся) или валидировать через zod перед приведением (`schema.parse(data)` вместо `data as T`).

### 5.7 Prop drilling — Q7 (Low)

Состояние уведомлений (`unread`, `showNotifications`, колбэки) пробрасывается через 2–3 уровня. Вынести в `NotificationContext`.

### 5.8 Прочее (Low)

- `MyListings.tsx` — дубликат Supabase-запроса в `useEffect` и `load()` (DRY).
- `formatPrice` продублирован в `ListingCard.tsx` и `ListingDetail.tsx` → вынести в `src/lib/utils.ts`.
- Унифицировать тип результата API как `ApiResult<T>` (сейчас `ListingResult`/`ChatApiResult`/…).
- `useScrollRestoration.ts` jsdom-шим глотает ошибки в `catch` → добавить `console.warn` в dev.

---

## 6. Тестирование

### 6.1 Две падающие пачки — T1, T2 (High)

**T1.** `tests/features/profile/ProfilePage.test.tsx` — 4 теста падают с `useNav must be used within NavigationProvider`. Корень: `ProfilePage` теперь использует `useNavEntryState` (коммит `ed1dd6f`), а хелпер `renderWithAuth` не оборачивает в `NavigationProvider`.
```tsx
// обернуть в NavigationProvider в renderWithAuth()
import { NavigationProvider } from '@/app/navigation/NavigationProvider'
render(<NavigationProvider><AuthContext.Provider value={v}><ProfilePage/></AuthContext.Provider></NavigationProvider>)
```

**T2.** `.skill-tmp/cli/tests/e2e/preview.spec.ts` ломает CI (`Failed to resolve import "@playwright/test"`). Vitest подхватывает его, т.к. в `vite.config.ts` нет exclude.
```ts
// vite.config.ts → test.exclude добавить '.skill-tmp/**'
```

### 6.2 Критические компоненты без тестов — T3 (High)

- `src/features/listings/ListingDetail.tsx` (~270 строк, экран `detail`) — **ноль тестов** (loading/error/not-found, галерея, start-chat, boost, report).
- `src/features/listings/ListingForm.tsx` (~385 строк, создание/редактирование) — **ноль тестов** (валидация, геокод, орг-селект, аплоад, режим edit).

### 6.3 RLS покрытие = 0% — T4 (High)

Все API-тесты **полностью мокают** Supabase-клиент. Ни одна политика RLS не проверяется (ни через реальный тестовый проект, ни через имперсонацию). При этом баги S2/S3/S4 — именно ошибки RLS, которые тесты не ловят.

**Ремедиация.** Добавить `supabase/tests/` с pgTAP/SQL-тестами (или интеграционные тесты через тестовый проект Supabase): IDOR-проверка — user A не видит данные user B. См. раздел 3.7.

### 6.4 Слабые тесты — T5 (Medium)

`App.test.tsx` (57 строк) только проверяет заголовок; нет сценария «не авторизован → AuthScreen», loading, `reset()` при смене сессии.

### 6.5 Пропущенные крайние случаи — T6 (Medium)

| Сценарий | Где | Severity |
|---|---|---|
| Listing not-found (null после fetch) | `ListingDetail.tsx` | High |
| RLS-отказ (42501) в API | все api-тесты | High |
| Network failure (reject) | `listListings`/`createListing` | Medium |
| Thread: отправка с attachment, отображение | `Thread.tsx` | Medium |
| Thread: review-формa при `chat.status='closed'` | `Thread.tsx` | Medium |
| `boostListing` error-path | `api.ts` | Medium |

### 6.6 Инфраструктура — T7 (Low)

- OOM воркера при `npm test` (49 файлов + jsdom). Митигация: `exclude: ['.skill-tmp/**']` + `poolOptions.forks.execArgv: ['--max-old-space-size=4096']`.
- Два паттерна моков: `vi.mock` (37 файлов) vs `vi.doMock`+dynamic import (8 файлов, нужно для chain-моков Supabase). Необходимо, но хрупко — задокументировать конвенцию.

---

## 7. Приоритизированный план исправлений (roadmap)

> Формат: задача → severity → трудоёмкость → как проверяем. Исправления вносятся отдельными атомарными коммитами (по AGENTS.md — не `git add -A`, не коммитить чужие WIP-файлы).

### P0 — критично, до любого релиза/публикации

| ID | Задача | Sev | Труд | Проверка |
|----|--------|-----|------|----------|
| P0-1 | Задеплоить CSP + security headers (A1, A2) на уровне хостинга/CDN; начать с Report-Only | Crit/High | M | Заголовки видны в браузере; прогон CSP-эвалуэтора |
| P0-2 | Исправить RLS `subscriptions` — отозвать INSERT/UPDATE у authenticated (S2) | High | S | Попытка клиентом вставить active-подписку → отказ |
| P0-3 | Исправить RLS `organization_members` — управление только owner/admin (S3) | High | S | Участник не может повысить себя до owner |
| P0-4 | Починить `ProfilePage.test.tsx` (NavigationProvider) — T1 | High | S | `npm test` → 0 падений по ProfilePage |
| P0-5 | Исключить `.skill-tmp/**` из vitest (T2) | High | S | `npm test` без ошибки playwright |

### P1 — высокий приоритет (следующий спринт)

| ID | Задача | Sev | Труд | Проверка |
|----|--------|-----|------|----------|
| P1-1 | `claim_invite`: проверка `p_user_id=auth.uid()` или отзыв execute у authenticated (S4) | Med | S | Нельзя сжечь чужой инвайт |
| P1-2 | Добавить GRANT для `user_settings` и проверить GRANT всех новых таблиц (S6) | Med | S | `useSettings` работает из клиента |
| P1-3 | Заменить пустые `catch` в `chatApi.ts` на `console.warn` (Q1) | High | S | Ошибки доставки видны в логах |
| P1-4 | Проверить/вернуть ошибку `claim_invite` в `AuthProvider` (Q2) | High | S | Сбой RPC показывается пользователю |
| P1-5 | Фокус-менеджмент на смене экранов (Q3) | High | M | Tab-навигация переносит фокус |
| P1-6 | Тесты `ListingDetail.test.tsx` и `ListingForm.test.tsx` (T3) | High | M | Покрыты критические пути |
| P1-7 | RLS-тесты (IDOR) в `supabase/tests/` (T4) | High | L | User A не читает данные user B |
| P1-8 | SCA в CI: `npm audit` + Dependabot (A4) | Med | S | Прогон audit в пайплайне |

### P2 — средний приоритет

| ID | Задача | Sev | Труд | Проверка |
|----|--------|-----|------|----------|
| P2-1 | `build.sourcemap: false` (A5) | Low | S | В проде нет .map |
| P2-2 | Allowlist схем URL для `attachment_path` (A6) | Low | S | `javascript:` не рендерится |
| P2-3 | Storage RLS для `message-attachments` или удалить мёртвую ссылку (S5) | Med | M | Бакет и политики корректны/отсутствуют |
| P2-4 | Mock-аккаунты: невозможность логина (S7) | Med | S | Вход по mockpass заблокирован |
| P2-5 | `users.rating` колонка или пересчёт (S8) | Low | S | `create_review` не падает |
| P2-6 | `search_path = ''` для SECURITY DEFINER RPC (S9) | Low | S | Адвайзор Supabase чист |
| P2-7 | `App.toggleNotifications` → replace (Q4) | Med | S | Нет дублей в стеке |
| P2-8 | Убрать dual state в Feed (Q5) | Med | M | Один паттерн state |
| P2-9 | Заменить `as` на generics/zod (Q6) | Med | L | Без `as never` |
| P2-10 | NotificationContext (Q7) | Low | M | Нет prop drilling |
| P2-11 | DRY: `formatPrice`, `ApiResult`, MyListings (Q8) | Low | S | Меньше дубликатов |
| P2-12 | Переписать `security-review.md`/`backend-analysis.md` под все миграции (S1) | High | M | Полная RLS-матрица |
| P2-13 | Миграция на publishable/secret ключи (3.5) | Low | M | Ключи ротируемы |

---

## 8. Источники (Context7 + websearch), использованные при подготовке плана

- **Context7 — `/supabase/supabase`**: RLS policy design, `USING` vs `WITH CHECK`, `auth.uid()` через `(select auth.uid())`, индексы на колонках политик, `FORCE ROW LEVEL SECURITY`, storage security, Security Advisor lints (`rls_disabled_in_public`, `rls_references_user_metadata`).
- **Context7 — `/reactjs/react.dev`**: React 19 auto-escaping в JSX; опасность `dangerouslySetInnerHTML` и необходимость санитизации; `javascript:` URL в `href`/`src` теперь выбрасывает ошибку в React 19.
- **Context7 — `/vitejs/vite`**: `VITE_` префикс экспонирует переменные в бандл; `envPrefix` нельзя делать пустым; `keepProcessEnv`; настройка CSP через хост/CDN.
- **Websearch (Exa)**: «Supabase RLS best practices and common mistakes 2026» (Veriploy/SecureStartKit/AgileSoftLabs — enable RLS на всех таблицах, WITH CHECK, IDOR-тест через реальный ключ, `rls_disabled_in_public` lint); «Supabase anon vs service_role key exposure» (anon publishable безопасен ТОЛЬКО с RLS; service_role обходит RLS, никогда не в клиенте; migration на publishable/secret keys 2026); «SPA security XSS CSP 2026» (Safeguard/WorkOS/OWASP — строгий nonce CSP, HttpOnly cookies > localStorage, DOMPurify на raw-HTML, SCA в CI, X-Frame-Options/frame-ancestors).

---

## 9. Итог

Код клиента написан добротно (нет прямых XSS-стоков, есть Zod-валидация, покрытие юнитов/интеграции для навигации и основных фич высокое). **Главные риски — на уровне данных и деплоя**: отсутствие CSP (A1, Critical), три дефекта RLS, дающих обход оплаты/повышение прав/сжигание инвайтов (S2/S3/S4), и устаревшая документация по безопасности, создающая ложное чувство защищённости (S1). Два падающих теста и нулевое RLS-покрытие — единственные блокеры стабильности CI. Все находки имеют конкретные, проверяемые шаги ремедиации в разделе 7.

**Следующий шаг:** согласовать план, после чего реализовать P0, затем P1. Каждый пункт — отдельный атомарный коммит, ограниченный своими файлами.
