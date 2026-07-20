# Дизайн: восстановление позиции скролла и состояния экранов (navigation stack)

Дата: 2026-07-21
Статус: черновик для ревью

## Контекст

Приложение — React 19 + Vite + TS SPA на Supabase. Навигация построена на
view-state: `AppContent` (`src/app/App.tsx`) держит `view: View` в `useState`,
переходы обёрнуты в `AnimatePresence mode="wait"` + `PageTransition` (opacity +
translateY). Скролл страницы — это `window` (в `MenuNav` уже слушают
`window.scrollY` для сжатия дока).

Проблема: при уходе с ленты (или любого экрана) и возврате «назад»:
1. теряется вертикальная позиция скролла (страница прыгает наверх);
2. `Feed` хранит `filters` и `page` в локальном `useState`
   (`src/features/listings/Feed.tsx:31-35`) — при возврате фильтры и страница
   сбрасываются, лента перезапрашивается с нуля;
3. нет понятия «предыдущий экран» — `onBack` просто делает
   `navigate('home')`, сбрасывая `selected`/`selectedChatId`.

Цель: «грамотно» реализовать восстановление скролла + состояния экрана при
навигации назад, не привязываясь к браузерной истории.

## Решения (согласованы с пользователем)

1. **Полноценный стек навигации** в памяти: вперёд/назад между любыми
   экранами, а не только home. Без интеграции с браузерной историей
   (history API / hash-роутинг не используем).
2. **Восстанавливаем всё состояние**: scroll для всех экранов + для home
   фильтры/страница, для profile активная вкладка, для thread позиция переписки.
3. **Только в рамках сессии** — стек живёт в памяти React, F5 сбрасывает на home.

## Подход

Централизованный `NavigationProvider` с «сумкой состояния» на каждую запись
стека. Рекомендованный и выбранный вариант (vs лёгкий Map и hash-роутинг).

### Модель стека

```ts
// src/app/navigation/types.ts
export type View =
  | 'home' | 'new' | 'mine' | 'detail' | 'profile'
  | 'chats' | 'thread' | 'privacy' | 'terms'

export type NavParams = { listingId?: string; chatId?: string }

export interface NavEntry {
  key: string                         // стабильный id записи
  view: View
  params: NavParams
  scrollY: number                    // сохранённая позиция (window или контейнер)
  state: Record<string, unknown>     // filters/page, active tab, …
}
```

Провайдер хранит `entries: NavEntry[]` и `index: number`:
- `push(view, params?)` — отсекает «будущее» после `index`, добавляет запись,
  `index++`. Новая запись: `scrollY = 0`, `state = {}`.
- `replace(view, params?)` — заменяет запись по `index`.
- `back()` — `index = max(0, index - 1)`.
- `goForward()` — `index = min(entries.length - 1, index + 1)`.
- `reset()` — `[initialEntry]`, `index = 0` (используется при logout / смене
  сессии).
- `canGoBack = index > 0`, `canGoForward = index < entries.length - 1`.
- `current = entries[index]`.

Обновление `current.scrollY` и `current.state` делается иммутабельно (новый
объект записи) и вызывает ре-рендер через контекст.

### Хуки

`useNav()` — доступ к `push/replace/back/goForward/reset/canGoBack/
canGoForward/current`.

`useNavEntryState<T>(name: string, initial: T): [T, (v: T) => void]`
— читает `current.state[name] ?? initial`, пишет в `current.state[name]`
иммутабельно. Состояние переживает размонтирование экрана, т.к. живёт в записи
стека, а не в `useState` экрана. При возврате к записи хук отдаёт сохранённое
значение.

`useScrollRestoration(target?: () => HTMLElement | Window = () => window)`
— эффект:
- на маунте: берёт `savedY = current.scrollY`; запускает `requestAnimationFrame`-
  цикл, вызывающий `scrollTo(0, savedY)` (или `target().scrollTop = savedY`),
  пока позиция не применилась (страница/контейнер достаточно высоки) или не
  исчерпан лимит кадров (~30). Это корректно обрабатывает асинхронную загрузку
  листингов home: скролл «доедет» как только контент отрисуется.
- на анмаунте (cleanup): пишет текущую позицию (`window.scrollY` или
  `target().scrollTop`) в `current.scrollY`.

`history.scrollRestoration = 'manual'` выставляется один раз при старте
провайдера (отключает собственное поведение браузера, которое для SPA бесполезно).

## Интеграция в `App.tsx`

- `AppContent` оборачивается в `NavigationProvider`; стек инициализируется
  записью `{ view: 'home' }`.
- Вместо `view` / `selected` / `selectedChatId` читаем `current.view` и
  `current.params`.
- `navigate(next)` (навигация меню) → `push(next)` (no-op если уже current);
  при необходимости сброса стека — `replace`.
- `openDetail(listing)` → `push('detail', { listingId: listing.id })`.
- `openChat(chatId)` → `push('thread', { chatId })`.
- `toggleNotifications` → `setShowNotifications` + при необходимости
  `push('chats')`.
- все `onBack={() => navigate('home')}` → `back()`.

Рендер `AnimatePresence mode="wait"` сохраняется: старая страница полностью
размонтируется до маунта новой, cleanup корректно сохраняет scrollY, новая —
восстанавливает. Возможен крошечный визуальный сдвиг внутри 200ms-анимации
перехода — допустимо.

## Что восстанавливаем

| Экран            | Scroll | Состояние (через useNavEntryState)        |
|------------------|--------|-------------------------------------------|
| home (Feed)      | ✅     | `feedFilters`, `feedPage`                 |
| profile          | ✅     | `profileTab` (активная вкладка)           |
| thread (чат)     | ✅     | — (scroll окна или внутр. контейнера)     |
| chats            | ✅     | —                                         |
| mine             | ✅     | —                                         |
| new              | ✅     | —                                         |
| privacy / terms  | ✅     | —                                         |

## Изменения файлов

Создаём:
- `src/app/navigation/types.ts`
- `src/app/navigation/NavigationProvider.tsx`
- `src/app/navigation/useNavEntryState.ts`
- `src/app/navigation/useScrollRestoration.ts`

Правим:
- `src/app/App.tsx` — провайдер, `navigate`/`openDetail`/`openChat`/`onBack`
  через стек, чтение `current.view`/`current.params`.
- `src/app/screens/HomeFeed.tsx` — биндит `feedFilters`/`feedPage` в нав-запись,
  передаёт в `Feed` как controlled пропсы.
- `src/features/listings/Feed.tsx` — принимает controlled `filters` /
  `onFiltersChange` / `page` / `onPageChange` (опц. дефолты, чтобы текущие
  тесты `<Feed onOpen={...} />` оставались зелёными).
- `src/features/profile/components/ProfilePage.tsx` — активная вкладка в
  `useNavEntryState('profileTab', 'personal')`.
- `src/features/chat/Thread.tsx` — при необходимости `target` на внутренний
  скролл-контейнер (проверить при имплементации, скроллит ли окно).
- `src/app/screens/*.tsx` — `onBack` → `back()`.

## Тестирование

- Юнит (`navigation/`): логика стека push/back/forward/replace/reset;
  `useNavEntryState` сохраняет значение при remount с той же записью.
- Интеграция (App-уровень через Testing Library): сценарий «открыл деталь →
  проскроллил → назад → home»: мок `window.scrollTo`, проверка что
  `feedFilters`/`feedPage` и `scrollY` восстановлены.
- Регрессия: существующие тесты `Feed.test.tsx` остаются зелёными.

## Риски

- `AnimatePresence mode="wait"`: корректно благодаря cleanup на анмаунте.
- Thread scroll-контейнер: уточняется на месте; хук уже принимает `target`.
- Объём правок: атомарен по экранам, но затрагивает `App.tsx` и несколько
  экранов — делаем одним связным PR.
