# Frontend — «напрямую» MVP

## Стек (фактический)

| Зависимость | Версия | Назначение |
|---|---|---|
| React | ^19.2.7 | UI-библиотека |
| react-dom | ^19.2.7 | Рендер в DOM |
| Vite | ^8.1.5 | Сборщик / dev-сервер (`@vitejs/plugin-react`) |
| TypeScript | 6 (alias) + `@typescript/native` 7 | Типы / typecheck (`tsc -b`) |
| Tailwind CSS | ^4.3.3 | Утилитарные стили (через `@tailwindcss/vite`, **без PostCSS**) |
| framer-motion | ^12.42.2 | Анимации (dock-панель, переходы экранов) |
| lucide-react | ^1.25.0 | Иконки |
| zod | ^4.4.3 | Валидация форм (профиль, объявление, инвайт) |
| @supabase/supabase-js | ^2.110.7 | Клиент БД/Auth/Realtime/Storage |
| Vitest | ^4.1.10 | Тесты (unit + integration через MSW) |
| ESLint | ^10.7.0 | Линт (`eslint .`) |

## Структура файлов

```
index.html              — точка входа HTML (lang="ru")
src/
  main.tsx              — ReactDOM.createRoot, обёртка провайдерами
  app/
    App.tsx             — view-роутер (стейт view), MenuNav, scroll-compact,
                          панель уведомлений, EnvironmentNotice
    screens/            — ленивые экраны (React.lazy + Suspense):
                          HomeFeed, NewListing, MyListingsScreen,
                          ListingDetailScreen, ChatsScreen, ThreadScreen,
                          ProfileScreenWrapper, LegalScreen
  components/
    layout/             — MenuBar (dock-навигация)
    system/             — системные компоненты (баннеры, заглушки)
  features/
    auth/               — AuthProvider, AuthScreen, useAuth
    chat/               — чат-лист, тред, realtime-подписки
    listings/           — лента, фильтры, форма объявления, детали
    photos/             — загрузка/удаление фото (photoApi, PhotoUploader)
    profile/            — профиль (PersonalInfoTab, SettingsTab, ConnectionsTab,
                          DangerTab), AvatarUpload, useProfile
    legal/              — Privacy/Terms (заглушки 152-ФЗ)
    reports/            — жалобы (UI «Пожаловаться»)
  lib/
    supabase.ts         — getSupabaseClient()
    storage.ts          — storageBuckets, getAvatarPublicUrl,
                          getListingPhotoUrl, removeAvatar, removeListingPhoto
    env.ts              — чтение VITE_SUPABASE_* из import.meta.env
    utils.ts            — formatPrice, timeAgo, валидация
  styles/               — глобальные стили Tailwind
  test/                 — общие тестовые утилиты/моки
  types/                — типы БД (Database), доменные типы
```

## Навигация без react-router

Приложение — SPA с маршрутизацией через стейт `view` в `App.tsx`
(условный рендеринг, без react-router). Dock-панель (`MenuBar`) переключает
`view`; тяжёлые экраны грузятся лениво через `React.lazy`.

| view | Экран | Описание |
|---|---|---|
| `feed` | HomeFeed | Публичная лента + фильтры + пагинация |
| `new` | NewListing | Создание объявления (offer / request) |
| `mine` | MyListingsScreen | Свои объявления, редактирование/архив |
| `chats` | ChatsScreen | Список диалогов, бейдж непрочитанных |
| `thread` | ThreadScreen | Переписка по объявлению (realtime) |
| `profile` | ProfileScreenWrapper | 4 вкладки: Личные данные / Аккаунт / Подключения / Действия |
| `privacy` / `terms` | LegalScreen | Юр. тексты-заглушки |

## Ключевые потоки

1. Загрузка → `supabase.auth.getSession()`; нет сессии → `AuthScreen`.
2. Есть сессия → профиль из `users` (`useProfile` / `AuthProvider`).
3. Лента/мои объявления → запросы к Supabase (фильтры на клиенте +
   пагинация `range()`).
4. Чат → `open_or_create_chat` RPC (атомарно), затем realtime-подписка на
   `messages` (`subscribeMessages` с корректной отпиской).
5. Аватар → `AvatarUpload`: ресайз на клиенте до 500×500, удаление старого
   объекта, `upload(userId)` (объект `avatars/{userId}`, RLS через
   `private.user_id_from_avatar_path`).

## Стилизация

- Tailwind CSS 4 (utility-first), конфигурация через `@tailwindcss/vite`,
  не через `tailwind.config.js` + PostCSS.
- Тема — кастомные токены (цвета `primary`/`surface`/`muted`/`border-muted`
  и т.п.) в `src/index.css` / `src/styles/`.
- Анимации — framer-motion (dock scale при scroll, AnimatePresence между
  экранами).
- Иконки — `lucide-react`.

## Запуск

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # tsc -b && vite build → dist/
npm run preview    # превью production-сборки
npm run test       # vitest run
npm run lint       # eslint .
```
