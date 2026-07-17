# Frontend — «напрямую» MVP

## Стек

| Зависимость | Версия | Назначение |
|---|---|---|
| React | ^18.3.1 | UI-библиотека |
| react-dom | ^18.3.1 | Рендер в DOM |
| lucide-react | ^0.383.0 | Иконки |
| Vite | ^5.4.0 | Сборщик / dev-сервер |
| Tailwind CSS | ^3.4.10 | Утилитарные стили |
| PostCSS + Autoprefixer | — | Пост-обработка CSS |

## Структура файлов

```
index.html              — точка входа HTML (lang="ru")
src/
  main.jsx              — ReactDOM.createRoot, подключение storageShim → App
  storageShim.js        — заглушка window.storage (deprecated, не используется)
  lib/supabase.js       — клиент Supabase
  components/Auth.jsx   — экран логина/регистрации
  App.jsx               — всё приложение
  index.css             — @tailwind base/components/utilities
```

## Архитектура App.jsx

Единый компонент `App()` с маршрутизацией через стейт `view`:

| view | Экран | Описание |
|---|---|---|
| `feed` | Лента | Список объявлений + фильтры (тип, город, комнаты, цена) |
| `new` | Форма | Создание нового объявления (offer / request) |
| `mine` | Мои | Объявления текущего пользователя, удаление |
| `chats` | Список чатов | Превью бесед, отсортированных по последнему сообщению |
| `thread` | Чат | Переписка с собеседником по конкретному объявлению |

### Жизненный цикл

1. Загрузка → проверка `supabase.auth.getSession()`
2. Нет сессии → экран `Auth` (логин / регистрация email+пароль)
3. Есть сессия → загрузка профиля из `users` по `userId`
4. Навбар с 4 экранами + кнопка редактирования профиля + выход
5. `feed` / `mine` → загрузка объявлений из Supabase
6. `chats` → загрузка чатов текущего пользователя
7. `thread` → реалтайм-подписка на сообщения (Supabase Realtime)

### Маршрутизация

Нет react-router. Навигация — стейт `view` +条件 рендеринг (`{view === 'feed' && ...}`).

## Компоненты

### Auth

Экран логина/регистрации. Два режима: `login` и `register`.
- Регистрация: имя, город, email, пароль → `supabase.auth.signUp()` с `data: { name, city }`
- Логин: email, пароль → `supabase.auth.signInWithPassword()`
- При регистрации триггер в БД автоматически создаёт запись в `users`
- Ошибки отображаются на русском

### DirectionTag

Бейдж «Сдаётся» / «Ищут» с иконкой. Пропсы: `type` (`offer` | `request`), `size` (`sm` | `md`).

### ListingCard

Карточка объявления: бейдж направления, цена, город/комнаты/площадь, описание, автор + время, кнопка «Написать» или «Удалить».

Пропсы: `listing`, `isMine`, `onContact`, `onDelete`.

### NavButton

Кнопка навбара с иконкой + текст. Пропсы: `active`, `icon`, `label`, `onClick`.

## Стилизация

- **Инлайновые стили** через объекты (`style={{...}}`), не CSS-модули
- **Шрифты** (подключаются через `@import` в inline-стиле):
  - Fraunces — display-заголовки (`fontDisplay(weight)`)
  - Inter — основной текст (`fontBody(weight)`)
  - IBM Plex Mono — цены (`fontMono(weight)`)
- **Цвета** — объект `COLORS`:

| Имя | HEX | Назначение |
|---|---|---|
| `paper` | `#F3F2ED` | Фон страницы |
| `paperSoft` | `#EAE8E0` | Мягкий фон |
| `ink` | `#1D1B18` | Основной текст |
| `muted` | `#736F65` | Приглушённый текст |
| `deep` | `#16302E` | Основной акцент (тёмно-зелёный) |
| `deepSoft` | `#20423F` | Вторичный акцент |
| `offer` | `#B9713A` | Тип «Сдаю» |
| `offerBg` | `#FAF0E3` | Фон бейджа «Сдаю» |
| `request` | `#3E7C74` | Тип «Ищу» |
| `requestBg` | `#E9F2EF` | Фон бейджа «Ищу» |
| `border` | `#E2DFD3` | Рамки |
| `white` | `#FFFFFF` | Белый |

## Фильтрация ленты

| Фильтр | Стейт | Тип сравнения |
|---|---|---|
| Направление | `filterType` | Точное: `all` / `offer` / `request` |
| Город | `filterCity` | Частичное совпадение (регистронезависимое) |
| Комнаты | `filterRooms` | Точное: `any` или значение |
| Цена до | `filterMaxPrice` | Числовое `<=` |

## Запуск

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # → dist/
npm run preview    # превью production-сборки
```
