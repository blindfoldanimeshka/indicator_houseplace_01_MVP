# напрямую

Прямая аренда жилья без посредников — арендодатели и квартиранты общаются напрямую.

## Стек

- React 18 + Vite 5
- Tailwind CSS 3
- Supabase (PostgreSQL + Auth + Realtime)
- lucide-react
- Vitest + Testing Library + MSW (тесты)

## Запуск

### Предварительные требования
- Node.js 18+
- Аккаунт в [Supabase](https://supabase.com)

### Установка

```bash
npm install
```

### Настройка

1. В [Supabase Dashboard](https://supabase.com/dashboard) создайте проект
2. В **SQL Editor** выполните содержимое `supabase/schema.sql`
3. В **Table Editor** включите Realtime на таблице `messages`
4. Создайте файл `.env` в корне проекта:

```
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш-annon-key
```

### Команды

```bash
npm run dev          # Сервер разработки → http://localhost:5173
npm run build        # Production-сборка → dist/
npm run preview      # Превью production-сборки
npm run test         # Запуск тестов
npm run test:watch   # Тесты в watch-режиме
```

## Структура проекта

```
src/
├── App.jsx                 # Все views: feed, new, mine, chats, thread
├── main.jsx                # Точка входа
├── index.css               # Tailwind + shimmer-анимация
├── lib/
│   ├── supabase.js         # Supabase-клиент (createClient)
│   └── utils.js            # Хелперы: formatPrice, timeAgo, validateForm
├── api/
│   ├── listings.js         # CRUD: fetchListings, createListing, deleteListing, fetchMyListings
│   └── chats.js            # CRUD: fetchChats, openOrCreateChat, fetchThread, sendMessage, subscribeToChat
├── components/
│   └── Auth.jsx            # Экран входа/регистрации
└── storageShim.js          # Legacy (не используется)

supabase/
└── schema.sql              # Полная схема БД

tests/
├── setup.js                # Test setup (@testing-library/jest-dom)
├── helpers/
│   └── create-mock.js      # Фабрика моков Supabase для unit-тестов
├── __mocks__/
│   ├── handlers.js         # MSW-хендлеры (HTTP-моки для интеграционных тестов)
│   └── msw-server.js       # MSW-сервер
├── unit/
│   ├── listings.test.js    # API listings: 10 тестов
│   ├── chats.test.js       # API chats: 9 тестов
│   ├── auth.test.jsx       # Auth-компонент: 7 тестов
│   └── helpers.test.js     # Хелперы: 15 тестов
├── integration/
│   ├── register-flow.test.js   # E2E: регистрация → профиль
│   ├── listing-flow.test.js    # E2E: создание → лента → удаление
│   ├── chat-flow.test.js       # E2E: чат → сообщение
│   └── filter-flow.test.js     # E2E: фильтры → результаты
└── db/
    └── rls-policies.test.js    # RLS-политики: видимость, ownership, доступ к чатам

docs/
├── README.md               # Индекс документации
├── frontend.md             # Компоненты и структура UI
├── backend.md              # API-слой и Supabase-интеграция
└── db.md                   # Схема БД, RLS-политики, триггеры
```

## Функциональность

### Авторизация
- Регистрация email + пароль (автоматическое создание профиля через триггер)
- Вход по email + пароль
- Восстановление сессии при перезагрузке
- Выход из аккаунта

### Профиль
- Просмотр имени и города в хедере
- Редактирование имени и города (inline)

### Объявления
- **Создание**: тип (Сдаю/Ищу), город, комнаты, площадь, цена, описание
- **Лента**: все активные объявления с фильтрами
- **Фильтры**: по типу, городу (ILIKE), количеству комнат, максимальной цене
- **Удаление**: мягкое удаление (soft delete)
- **Мои объявления**: список собственных объявлений

### Чаты
- Список чатов с последним сообщением
- Открытие чата по кнопке «Написать» на объявлении
- Идемпотентное создание чата (не дублирует для одного объявления)
- Тред сообщений с авторизацией участников
- **Realtime**: новые сообщения через Supabase Realtime (WebSocket)
- Автоскролл к последнему сообщению

### Навигация
- Лента → Разместить → Мои → Сообщения → Тред

## База данных

### Таблицы

| Таблица | Описание |
|---|---|
| `users` | Профили (id, name, city) |
| `listings` | Объявления (type: offer\|request, city, rooms, price, area, description) |
| `chats` | Чаты, привязаны к объявлению |
| `chat_participants` | Участники чатов |
| `messages` | Сообщения |

### Триггер

`handle_new_user()` — автоматически создаёт строку в `users` при регистрации в `auth.users`.

### RLS-политики

- **users**: чтение всем, обновление только своё
- **listings**: чтение (deleted_at IS NULL), создание/обновление/удаление только автором
- **chats**: чтение участникам, создание авторизованным
- **chat_participants**: чтение участникам чата, добавление авторизованным
- **messages**: чтение участникам чата, отправка только автором и участником

### Индексы

city, type, price, rooms, created_at (DESC), author_id, (chat_id + created_at)

## Тесты

```bash
npm test            # 59 тестов
npm run test:watch  # watch-режим
```

### Покрытие

| Уровень | Файлы | Тестов |
|---|---|---|
| Unit: API listings | `listings.test.js` | 10 |
| Unit: API chats | `chats.test.js` | 9 |
| Unit: Auth компонент | `auth.test.jsx` | 7 |
| Unit: Хелперы | `helpers.test.js` | 15 |
| Интеграция: регистрация | `register-flow.test.js` | 3 |
| Интеграция: объявления | `listing-flow.test.js` | 2 |
| Интеграция: чат | `chat-flow.test.js` | 2 |
| Интеграция: фильтры | `filter-flow.test.js` | 5 |
| RLS-политики | `rls-policies.test.js` | 6 |
| **Итого** | **10 файлов** | **59** |

### Что тестируется

- **Unit API**: мокаем Supabase-клиент, проверяем фильтры, trim, маппинг, обработку ошибок, идемпотентность, Realtime-подписку
- **Unit компоненты**: переключение режимов, валидация, русские сообщения об ошибках, вызов API
- **Интеграция**: полный цикл через MSW (HTTP-моки) — регистрация, CRUD объявлений, чат с отправкой сообщений, фильтрация
- **RLS**: видимость данных, ownership, доступ к чатам для участников/не-участников

## Документация

| Файл | Содержание |
|---|---|
| `docs/README.md` | Индекс документации |
| `docs/frontend.md` | Компоненты, структура UI, стили |
| `docs/backend.md` | API-слой, Supabase-интеграция, аутентификация |
| `docs/db.md` | Модели данных, PostgreSQL-схема, RLS, триггеры |
