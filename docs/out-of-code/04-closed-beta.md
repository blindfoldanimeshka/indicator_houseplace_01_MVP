# 04 — Фаза 8: Закрытая beta (пригласить 5–10 реальных пользователей)

> **Статус в проекте:** ⬜ Не начата. Фазы 0–7 завершены (`docs/progress.md`).
> Это последняя фаза roadmap. Документ — план механики доступа (инвайт-коды)
> и процесса сбора обратной связи.

---

## 1. Зачем закрытая бета и чем она НЕ является

Цель беты — не «показать красиво», а **найти, где реальные люди спотыкаются**,
пока проект ещё маленький и правки дешёвы. По `docs/plan.md` (шаги 8–10):
сначала вы сами дважды проходите весь путь под двумя аккаунтами, потом
зовёте 5–10 живых людей, у которых есть **настоящая потребность** снять или
сдать жильё прямо сейчас, даёте ссылку **без инструкций** и смотрите, где
они застревают.

Бета — НЕ публичный запуск, поэтому:
- 152-ФЗ риск невелик (осведомлённые тестировщики) — см. `03-152fz.md`;
- допустим встроенный SMTP Supabase (но собственный лучше — см. `02-smtp.md`);
- CAPTCHA можно оставить выключенной ИЛИ включить Turnstile (см. `01-captcha.md`),
  чтобы не мешать своим же тестировщикам.

---

## 2. Архитектура механики доступа: инвайт-коды

Варианты: whitelist по email (просто, но жёстко) или инвайт-коды (гибко,
можно «передать» знакомому). Для 5–10 человек выберем **инвайт-коды** —
ближе к реальному запуску и проще масштабировать.

### 2.1. Миграция: таблица `invites`

Новая миграция `supabase/migrations/20260719xxx_beta_invites.sql`:

```sql
-- Таблица инвайтов. Одна строка = один выданный код.
CREATE TABLE public.invites (
  code            TEXT PRIMARY KEY,
  created_by      UUID REFERENCES auth.users(id),   -- кто выдал (вы)
  used_by        UUID REFERENCES auth.users(id),     -- кто активировал
  used_at        TIMESTAMPTZ,
  note           TEXT,                               -- кому выдан (для себя)
  created_at     TIMESTAMPTZ DEFAULT now(),
  expires_at     TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Индекс для быстрой проверки при регистрации
CREATE INDEX idx_invites_used ON public.invites (used_by) WHERE used_by IS NOT NULL;
```

### 2.2. RLS для `invites`

Кто что видит:
- **Аноним** (при регистрации): может только **проверить** код (существует
  ли свободный, не просроченный). Не видит содержимое таблицы.
- **Авторизованный пользователь**: ничего (свои инвайты не нужны в UI).
- **Service role / admin**: полный доступ (выдача кодов, просмотр).

```sql
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Аноним может читать ТОЛЬКО факт существования неиспользованного кода.
-- Используем SECURITY DEFINER функцию, чтобы скрыть данные таблицы.
CREATE OR REPLACE FUNCTION public.is_invite_valid(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invites
    WHERE code = p_code
      AND used_by IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Политика: аноним может вызывать только эту функцию проверки,
-- но не читать саму таблицу.
CREATE POLICY "anon can validate invite"
  ON public.invites FOR SELECT
  USING (false);  -- прямое чтение запрещено; доступ только через функцию
```

> ⚠️ Прямая выдача/создание кодов делается **вручную через SQL-консоль
> Supabase** (вы — оператор), либо через Edge Function с service_role,
> вызываемую только вами. Не открывайте `INSERT` в `invites` для анонима.

### 2.3. Атомарная активация инвайта при регистрации

При регистрации нужно: создать `auth.users` (наш триггер создаст
`public.users`) И пометить инвайт использованным. Это две операции — делать
их атомарно через Edge Function (чтобы не создать пользователя без инвайта
или наоборот).

```ts
// supabase/functions/beta-signup/index.ts  (Deno, service_role)
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { email, password, name, city, inviteCode, captchaToken } = await req.json();

  // 1. Проверяем инвайт (функция is_invite_valid выше)
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: valid } = await db.rpc('is_invite_valid', { p_code: inviteCode });
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Недействительный инвайт-код' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. (опционально) проверка CAPTCHA — см. 01-captcha.md вариант Б

  // 3. Создаём пользователя
  const { data: user, error } = await db.auth.admin.createUser({
    email, password,
    user_metadata: { name, city },
    email_confirm: false,
  });
  if (error) return new Response(JSON.stringify({ error: error.message }),
    { status: 400, headers: { 'Content-Type': 'application/json' } });

  // 4. Помечаем инвайт использованным тем же пользователем
  await db.from('invites').update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('code', inviteCode);

  return new Response(JSON.stringify({ ok: true }),
    { headers: { 'Content-Type': 'application/json' } });
});
```

Деплой: `supabase functions deploy beta-signup`.

> **Альтернатива (проще, если бета без CAPTCHA):** оставить нативный
> `supabase.auth.signUp` (как сейчас), а проверку инвайта делать на клиенте
> перед сабмитом через `supabase.rpc('is_invite_valid')`. Минус — клиентскую
> проверку можно обойти, но на закрытой бете это приемлемо (тестировщики
> свои). Если нужна настоящая защита доступа — вариант с Edge Function.

### 2.4. Генерация кодов (вы, оператор)

В SQL-консоли Supabase:

```sql
-- Выдать 10 кодов (например, формат BETA-XXXX)
INSERT INTO public.invites (code, created_by, note)
SELECT
  'BETA-' || upper(substring(md5(random()::text) from 1 for 6)),
  'ваш-user-id',
  'для беты'
FROM generate_series(1, 10)
ON CONFLICT (code) DO NOTHING;

-- Посмотреть выданные и неиспользованные
SELECT code, used_by, used_at, created_at FROM public.invites
WHERE used_by IS NULL ORDER BY created_at;
```

---

## 3. UI изменения (минимум)

- На экране регистрации (`AuthScreen`) добавить **поле «Инвайт-код»** и
  валидацию (6+ символов, префикс `BETA-`).
- Ошибка «Недействительный инвайт-код» на русском.
- При успехе — обычный flow подтверждения email (`email-confirmation guard`,
  фаза 3) + вход.

---

## 4. Процесс беты (по `docs/plan.md`, шаги 8–10)

### Шаг 8 (до пользователей) — пройти самим
Дважды полный путь под двумя аккаунтами (два браузера / две почты):
собственник публикует → арендатор видит → пишет в чат → получает ответ.
Баги должны найти вы, не бета-юзеры.

### Шаг 9 — отобрать 5–10 человек
Критерий: **реальная потребность прямо сейчас** (снять/сдать жильё),
НЕ «абстрактные тестировщики» и не просто друзья-разработчики.
- Дать ссылку на задеплоенную версию БЕЗ пошаговой инструкции.
- Сказать честно: «тестируем прототип, пишите, где непонятно».

### Шаг 10 — собрать и обработать фидбек
- Канал: простая форма (Яндекс.Формы) ИЛИ чат с вами. Не усложнять.
- Метрики (вручную или через Sentry/аналитику):
  - Сколько дошли до публикации объявления?
  - Сколько написали в чат и получили ответ?
  - Где отвалились (по шагам формы регистрации/создания)?
- Действие: фикс критичных багов → расширение круга → только потом решать
  следующие фичи по реальным болям, а не по красивому списку.

---

## 5. Чек-лист Фазы 8

- [ ] Миграция `invites` накатана на `MVP-House`
- [ ] RLS: аноним не читает таблицу, только `is_invite_valid`
- [ ] Выдано 10 инвайт-кодов (SQL-консоль)
- [ ] Активация атомарна (Edge Function ИЛИ клиентская проверка на бете)
- [ ] Поле «Инвайт-код» на экране регистрации + валидация
- [ ] Вы сами прошли путь 2× под двумя аккаунтами (шаг 8)
- [ ] Отобраны 5–10 реальных пользователей (шаг 9)
- [ ] Настроен канал фидбека (форма/чат)
- [ ] Зафиксированы метрики прохождения воронки
- [ ] Критичные баги исправлены до расширения круга
- [ ] Принято решение по 152-ФЗ-инфраструктуре (см. `03-152fz.md`)

---

## 6. Связь с другими вне-кодовыми задачами

- **CAPTCHA (`01-captcha.md`):** на бете можно выключить или включить
  Turnstile — не мешать своим. Перед публичным запуском — обязательно вкл.
- **SMTP (`02-smtp.md`):** для беты допустим встроенный Supabase, но собственный
  SMTP снимает риск «письмо подтверждения не дошло → тестер застрял».
- **152-ФЗ (`03-152fz.md`):** на бете риск низкий, но решение по инфраструктуре
  лучше принять здесь, пока база маленькая.
