# 01 — CAPTCHA: защита форм регистрации и логина

> **Статус в проекте:** 🔲 Не подключено. По `docs/progress.md` (фаза 3b) на
> фронтенде уже заложен задел под hCaptcha/Turnstile, но без ключей CAPTCHA
> не активна. Этот документ — полный план от выбора провайдера до боевой
> серверной проверки.

---

## 1. Зачем это вообще нужно

CAPTCHA закрывает три конкретные угрозы, актуальные для нашего проекта аренды:

1. **Массовая регистрация ботов.** Без CAPTCHA скрипт за минуту создаёт
   сотни аккаунтов. Каждый аккаунт = запись в `auth.users` + запись в
   `public.users` (наш триггер `handle_new_user`). Это загрязняет базу и
   даёт ботам возможность публиковать спам-объявления.
2. **Брутфорс логина.** Перебор паролей через `signInWithPassword`.
   Supabase имеет свой rate-limit, но CAPTCHA — второй эшелон защиты.
3. **Спам через восстановление пароля.** `resetPasswordForEmail` (уже
   реализован в фазе 3b) можно дёргать в цикле, заваливая чужие ящики
   письмами. Это ещё и бьёт по репутации нашего SMTP-домена (см.
   `02-smtp.md`).

**Вывод:** CAPTCHA нужна минимум на трёх формах — регистрация, логин,
сброс пароля.

---

## 2. Выбор провайдера — три варианта, честное сравнение

Ключевая развилка: **Supabase Auth имеет ВСТРОЕННУЮ поддержку hCaptcha и
Cloudflare Turnstile** (проверка токена происходит на стороне серверов
Supabase автоматически, без нашего кода). Yandex SmartCaptcha такой
поддержки НЕ имеет — его придётся проверять вручную через Edge Function.

| Критерий | hCaptcha | Cloudflare Turnstile | Yandex SmartCaptcha |
|---|---|---|---|
| Нативная поддержка в Supabase Auth | ✅ Да | ✅ Да | ❌ Нет (ручная проверка) |
| Стабильность в РФ без VPN | ⚠️ Иногда режется | ⚠️ Зависит от домена | ✅ Стабильно |
| 152-ФЗ (данные в РФ) | ❌ Зарубежный | ❌ Зарубежный | ✅ Данные в РФ |
| Сложность интеграции | 🟢 Низкая | 🟢 Низкая | 🔴 Высокая (Edge Function) |
| Стоимость на старте | Free | Free | Free-tier есть |
| UX | Чекбокс/невидимая | Невидимая (лучший UX) | Чекбокс/невидимая |

### Рекомендация — зависит от приоритета

- **Если приоритет = скорость запуска закрытой беты (фаза 8):** берите
  **Cloudflare Turnstile**. Нативная поддержка Supabase = минимум кода,
  лучший UX (невидимая проверка). Для 5–10 знакомых тестировщиков вопрос
  152-ФЗ по CAPTCHA некритичен (см. `03-152fz.md` — риск на закрытой бете
  невелик).
- **Если приоритет = соответствие 152-ФЗ с первого дня публичного
  запуска:** берите **Yandex SmartCaptcha**. Данные остаются в РФ, но
  цена — ручная серверная проверка через Edge Function (раздел 4Б).

> **Мой совет для этого проекта:** начать с **Turnstile** на закрытой бете
> (быстро, нативно), а миграцию на Yandex SmartCaptcha запланировать перед
> публичным запуском вместе с общей 152-ФЗ-ревизией. Оба варианта описаны
> ниже полностью.

---

## 3. Общая архитектура (независимо от провайдера)

```
┌─────────────┐   1. рендер виджета     ┌──────────────────┐
│  Браузер    │ ──────────────────────► │ Провайдер CAPTCHA │
│ (форма      │ ◄────────────────────── │ (JS-виджет)       │
│  регистр.)  │   2. captcha-token      └──────────────────┘
└─────────────┘
       │ 3. signUp({ options: { captchaToken } })
       ▼
┌──────────────────────────────────────────────────────────┐
│  ВАРИАНТ А (Turnstile/hCaptcha):                           │
│  Supabase Auth сам проверяет token у провайдера           │
│                                                            │
│  ВАРИАНТ Б (Yandex): наша Edge Function проверяет token,   │
│  и только потом вызывает signUp через service_role        │
└──────────────────────────────────────────────────────────┘
```

**Золотое правило:** токен CAPTCHA всегда проверяется на СЕРВЕРЕ. Клиентскую
проверку тривиально обойти — злоумышленник просто не рендерит виджет и
шлёт запрос напрямую в API.

---

## 4А. Реализация — Cloudflare Turnstile (нативно, рекомендуется для беты)

### Шаг 1. Получить ключи

1. Зарегистрируйтесь на <https://dash.cloudflare.com> → раздел **Turnstile**.
2. Создайте виджет (**Add site**):
   - Domain: ваш прод-домен + `localhost` для разработки.
   - Widget mode: **Managed** (Cloudflare сам решает, показывать ли челлендж).
3. Получите **Site Key** (публичный, идёт в фронтенд) и **Secret Key**
   (приватный, идёт в Supabase).

### Шаг 2. Включить CAPTCHA в Supabase

Dashboard проекта `MVP-House` → **Authentication → Settings → Bot and Abuse
Protection → Enable Captcha protection**:
- Provider: **Turnstile**
- Secret key: вставить Secret Key из Cloudflare.

Либо через Management API (не хранить токен в git!):

```bash
export SUPABASE_ACCESS_TOKEN="ваш-токен"   # https://supabase.com/dashboard/account/tokens
export PROJECT_REF="ваш-project-ref"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "security_captcha_enabled": true,
    "security_captcha_provider": "turnstile",
    "security_captcha_secret": "ВАШ_TURNSTILE_SECRET_KEY"
  }'
```

### Шаг 3. Добавить Site Key в `.env`

Наш проект использует префикс `VITE_` (см. `.env` и `src/lib/env.ts`):

```dotenv
# .env  (значение — публичный Site Key, не секрет, но всё равно не хардкодить)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
```

Обновить `.env.example` и `src/lib/env.ts` (там уже есть валидация env через
Zod — добавить новое поле по образцу существующих).

### Шаг 4. Фронтенд-виджет

Установить обёртку (или подключить скрипт вручную):

```bash
npm install @marsidev/react-turnstile
```

В компоненте `AuthScreen` (регистрация/логин) — псевдокод под наш стек:

```tsx
import { Turnstile } from '@marsidev/react-turnstile';
import { useState } from 'react';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

function RegisterForm() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(values: RegisterValues) {
    if (!captchaToken) {
      // показать ошибку "Подтвердите, что вы не робот" на русском
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name, city: values.city },
        captchaToken,               // ← Supabase сам проверит его у Turnstile
      },
    });
    // ВАЖНО: после каждой попытки токен «сгорает». При ошибке — сбросить
    // виджет, чтобы пользователь получил новый токен.
  }

  return (
    <form onSubmit={/* ... */}>
      {/* ...поля name, city, email, password... */}
      <Turnstile
        siteKey={env.VITE_TURNSTILE_SITE_KEY}
        onSuccess={setCaptchaToken}
        onExpire={() => setCaptchaToken(null)}
        onError={() => setCaptchaToken(null)}
        options={{ language: 'ru', theme: 'light' }}
      />
      <button disabled={!captchaToken}>Зарегистрироваться</button>
    </form>
  );
}
```

**То же самое** добавить в форму логина (`signInWithPassword`) и в форму
сброса пароля (`resetPasswordForEmail`) — все три метода принимают
`options.captchaToken`.

### Шаг 5. Тесты (у нас Vitest + MSW, 90 тестов уже есть)

- **Unit:** форма не отправляет запрос, если `captchaToken === null`.
- **Unit:** после ошибки signUp токен сбрасывается (кнопка снова disabled).
- **Integration (MSW):** замокать успешный `signUp` — проверить, что
  `captchaToken` попал в тело запроса.
- Для тестов Turnstile отдаёт **тестовые ключи** (always-pass /
  always-fail / always-challenge) — используйте `always-pass` в тестовой
  среде через переменную окружения.

---

## 4Б. Реализация — Yandex SmartCaptcha (ручная, для 152-ФЗ)

Здесь нативной поддержки в Supabase нет. Мы НЕ можем передать
`captchaToken` в `signUp`. Вместо этого:

1. Отключаем публичную регистрацию через `anon`-ключ (или оставляем, но
   не доверяем ей).
2. Регистрация идёт **через свою Edge Function**, которая:
   - принимает данные формы + captcha-token;
   - проверяет token на сервере Яндекса (`server_key`);
   - только при успехе вызывает Supabase Admin API (`service_role`) для
     создания пользователя.

### Шаг 1. Ключи

Яндекс.Облако → **SmartCaptcha** → создать капчу → получить **client key**
(фронтенд) и **server key** (проверка на бэкенде).

### Шаг 2. Фронтенд-виджет

Подключить скрипт `https://smartcaptcha.yandexcloud.net/captcha.js` и
отрендерить контейнер с `data-sitekey`. Получить token из колбэка. React —
через ref или готовую обёртку. Token отправляем НЕ в `supabase.auth`, а в
нашу Edge Function.

### Шаг 3. Секрет в Supabase

```bash
# server_key никогда не должен попасть на клиент
supabase secrets set YANDEX_SMARTCAPTCHA_SERVER_KEY="ваш-server-key"
# секрет доступен в функции сразу, без повторного деплоя
```

### Шаг 4. Edge Function `register-with-captcha`

```ts
// supabase/functions/register-with-captcha/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { email, password, name, city, captchaToken } = await req.json();

  // 1. Проверяем токен у Яндекса (server-to-server)
  const verify = await fetch(
    'https://smartcaptcha.yandexcloud.net/validate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: Deno.env.get('YANDEX_SMARTCAPTCHA_SERVER_KEY')!,
        token: captchaToken,
        ip: req.headers.get('x-forwarded-for') ?? '',
      }),
    },
  );
  const result = await verify.json();
  if (result.status !== 'ok') {
    return new Response(JSON.stringify({ error: 'Капча не пройдена' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Только теперь создаём пользователя через service_role
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,  // предоставляется автоматически
  );
  const { error } = await admin.auth.admin.createUser({
    email, password,
    user_metadata: { name, city },
    email_confirm: false,  // письмо подтверждения уйдёт через наш SMTP
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Деплой:

```bash
supabase functions deploy register-with-captcha
```

### Шаг 5. Правки фронтенда

Форма регистрации вызывает `supabase.functions.invoke('register-with-captcha', ...)`
вместо `supabase.auth.signUp`. Логин и сброс пароля — аналогично, отдельными
функциями, либо один эндпоинт с параметром `action`.

> **Компромисс варианта Б:** больше кода, больше точек отказа, регистрация
> идёт через service_role (нужна осторожность). Зато данные CAPTCHA — в РФ.

---

## 5. Чек-лист внедрения

- [ ] Выбран провайдер (Turnstile для беты / Yandex для 152-ФЗ)
- [ ] Получены Site Key + Secret/Server Key
- [ ] Secret/Server Key НЕ в git (Supabase config / `supabase secrets`)
- [ ] Site Key добавлен в `.env`, `.env.example`, `src/lib/env.ts` (Zod)
- [ ] Виджет на форме регистрации
- [ ] Виджет на форме логина
- [ ] Виджет на форме сброса пароля
- [ ] Токен сбрасывается после каждой попытки (истекает)
- [ ] Серверная проверка работает (нативно или Edge Function)
- [ ] Тесты: пустой токен блокирует сабмит; токен уходит в запрос
- [ ] Проверено вручную в задеплоенной версии (не только локально)

---

## 6. Частые ошибки

| Ошибка | Последствие | Как избежать |
|---|---|---|
| Проверять токен только на клиенте | CAPTCHA бесполезна | Всегда серверная проверка |
| Не сбрасывать истёкший токен | Пользователь не может повторить | `onExpire` → сброс |
| Захардкодить Secret Key | Утечка через git | Только env/secrets |
| Забыть про `localhost` в доменах виджета | Разработка сломана | Добавить localhost в конфиг |
| Включить CAPTCHA, но не на reset-пароле | Спам-рассылка на чужие ящики | Виджет на всех трёх формах |
