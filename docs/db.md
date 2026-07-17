# База данных — «напрямую» MVP

## Текущее состояние

Данные хранятся в **Supabase** (PostgreSQL + Auth + Realtime).
Клиент: `src/lib/supabase.js`.
SQL-схема: `supabase/schema.sql`.

До миграции на Supabase данные хранились в `localStorage` (заглушка `window.storage`).

## Текущие модели данных

### Profile

Ключ: `profile` (personal scope)

| Поле | Тип | Описание |
|---|---|---|
| `userId` | string | `user_<timestamp36>_<random>` |
| `name` | string | Имя |
| `city` | string | Город (необязательно) |

### Listing

Ключ: `listing:<id>` (shared scope)

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | `listing_<timestamp36>_<random>` |
| `authorId` | string | `userId` автора |
| `authorName` | string | Имя автора |
| `type` | `"offer"` \| `"request"` | Сдаётся / Ищут |
| `city` | string | Город |
| `rooms` | string | `"Студия"`, `"1 комната"`, …, `"4+ комнат"` |
| `price` | number | Цена ₽/мес |
| `area` | number \| null | Площадь м² |
| `description` | string | Описание |
| `createdAt` | number | Unix timestamp (ms) |

### Chat thread

Ключ: `chat:<listingId>:<sorted_userIds>` (shared scope)

| Поле | Тип | Описание |
|---|---|---|
| `listingId` | string | ID объявления |
| `listingSummary` | string | Краткое описание для шапки чата |
| `participants` | `{ [userId]: name }` | 2 участника |
| `messages` | Message[] | Сообщения |

**Message:**

| Поле | Тип | Описание |
|---|---|---|
| `senderId` | string | `userId` отправителя |
| `senderName` | string | Имя отправителя |
| `text` | string | Текст |
| `ts` | number | Unix timestamp (ms) |

## Целевая схема — PostgreSQL

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  city VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('offer', 'request')),
  city VARCHAR(100) NOT NULL,
  rooms VARCHAR(20) NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  area INTEGER CHECK (area > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_type ON listings(type);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_rooms ON listings(rooms);
CREATE INDEX idx_listings_created ON listings(created_at DESC);

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_participants (
  chat_id UUID NOT NULL REFERENCES chats(id),
  user_id UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at);
```

## Миграции

| Инструмент | Стек |
|---|---|
| Prisma | Node.js |
| golang-migrate | Go |
| Flyway / Liquibase | Java / универсальные |

## Soft delete

Объявления удаляются через `deleted_at`. При загрузке ленты:
`WHERE deleted_at IS NULL`.

## Оценка объёмов (MVP)

| Метрика | Диапазон |
|---|---|
| Пользователей | 100 – 1 000 |
| Объявлений | 1 000 – 10 000 |
| Сообщений/день | 100 – 5 000 |
| Latency SELECT | < 50 ms |
| Latency INSERT | < 100 ms |

На этих объёмах PostgreSQL работает без шардирования.
