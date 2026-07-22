# Анимации и Motion в проекте

## Библиотека

Проект использует `motion/react` (framer-motion v12) для всех анимаций.

В `src/main.tsx` корневой компонент обёрнут в `MotionConfig` с параметром `reducedMotion="user"`. Это заставляет все `motion`-компоненты автоматически реагировать на системную настройку `prefers-reduced-motion`, если только они не переопределяют поведение через `useReducedMotion()`.

В CSS определены токены перехода:

| Токен | Значение |
|---|---|
| `--ease-smooth` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--duration-fast` | `150ms` |
| `--duration-base` | `200ms` |
| `--duration-slow` | `300ms` |

---

## Page Transitions

**Файл:** `src/app/App.tsx`  
**Компонент:** `PageTransition`

Тип: fade in/out с масштабированием. Без направленного слайда.

```tsx
const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
}

const pageTransition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1], // --ease-smooth
}
```

`AnimatePresence` используется с `mode="wait"` — анимация выхода завершается до начала анимации входа.

Применяется ко всем экранам: home, new, mine, detail, chats, thread, profile, privacy, terms.

---

## Custom Cursor

**Файл:** `src/components/CustomCursor.tsx`

Кастомная точка-курсор, которая заменяет системный курсор (внедряет `* { cursor: none !important; }` в `<head>`).

- **Позиция:** spring-tracked через `useMotionValue` + `useSpring`
- **Spring:** stiffness 500, damping 30, mass 0.6
- **Hover (интерактивные элементы):** ширина/высота 12px → 40px, цвет `rgba(125, 57, 235, 0.9)` → `rgba(125, 57, 235, 0.15)`, появляется border
- **Hover transition:** вторичный spring (damping 20, stiffness 400, mass 0.6)
- **Игнорируемые селекторы:** `.pagination`, `[data-cursor-ignore]`
- **Целевые элементы:** `button, a, input, select, textarea, [role="button"], [data-cursor]`

---

## Component Patterns

### Dropdown / Panel

Используется в `NotificationBell`, `NotificationPanel`, `ConfirmDialog`.

```tsx
const variants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
}
```

- NotificationBell: fade + vertical slide, duration 0.15, `AnimatePresence`
- NotificationPanel: spring (stiffness 500, damping 35), `AnimatePresence` на родителе
- Dropdown-контент всегда обёрнут в `AnimatePresence` для плавного скрытия

### Stagger List

**Feed (src/features/listings/Feed.tsx):**

```tsx
{listings.map((listing, i) => (
  <motion.div
    key={listing.id}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      type: 'spring',
      stiffness: 400,
      damping: 30,
      delay: Math.min(i * 0.04, 0.3),
    }}
  >
    <ListingCard ... />
  </motion.div>
))}
```

**NotificationPanel:**

```tsx
{notifications.map((note, i) => (
  <motion.li
    key={note.messageId}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.03 }}
  />
))}
```

Максимальная задержка для карточек — 0.3s, чтобы последние элементы не ждали слишком долго.

### Scroll Progress

**Файл:** `src/components/layout/AppShell.tsx`

Прогресс-бар: `useScroll` → `useSpring` → `useTransform` → `scaleX` на `<motion.div>`.

```tsx
const { scrollYProgress } = useScroll()
const prefersReduced = useReducedMotion()
const smoothX = useSpring(scrollYProgress, {
  stiffness: 120,
  damping: 30,
  restDelta: 0.001,
})
const scaleX = prefersReduced ? scrollYProgress : smoothX
```

Плюс два edge-fade оверлея (верхний и нижний) через `useTransform`:

- Верх: `scrollYProgress [0, 0.04] → opacity [0, 0.9]`
- Низ: `scrollYProgress [0.96, 1] → opacity [0, 0.9]`

Оба отключаются при `prefersReducedMotion`.

### Icon Hover

Пять иконок навигации с уникальными hover-эффектами. Все используют паттерн `useAnimation()` + `controls.start()` при `mouseenter`/`mouseleave`.

| Иконка | Файл | Эффект | Transition |
|---|---|---|---|
| SearchIcon | `src/components/icons/search.tsx` | Смещение x/y (поисковое движение) | duration 1, bounce 0.3 |
| PlusIcon | `src/components/icons/plus.tsx` | Вращение 0→180° | spring stiffness 100, damping 15 |
| HomeIcon | `src/components/icons/home.tsx` | pathLength двери (прорисовка) | duration 0.6 |
| MessageSquareIcon | `src/components/icons/message-square.tsx` | Scale + rotate wiggle (-7°…7°) | rotate 0.5s easeInOut, scale spring 400/10 |
| UserIcon | `src/components/icons/user.tsx` | pathLength + pathOffset головы/тела | path delay 0.2, duration 0.4 |

Все иконки также поддерживают управление анимацией извне через `ref` (имплементируют `startAnimation()` / `stopAnimation()`).

### Morph Heading

**Файл:** `src/components/MorphHeading.tsx`

Одноразовая анимация появления заголовка: размытие + подъём + fade in.

```tsx
<motion.h1
  initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
/>
```

При `prefersReducedMotion` blur и y убираются, остаётся только opacity.

### Highlighter

**Файл:** `src/components/Highlighter.tsx`

Два режима:

- **underline:** анимированная прорисовка `pathLength` под текстом (duration 0.5, easeInOut, delay 0.15)
- **highlight:** подложка с `scaleX` от 0 до 1 (duration 0.45, easeOut, delay 0.2)

### Auth Screen

**Файл:** `src/features/auth/AuthScreen.tsx`

Карточка входа/регистрации появляется с spring-анимацией:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
/>
```

### Photo Lightbox

**Файл:** `src/features/photos/PhotoLightbox.tsx`

- Оверлей: fade (duration 0.15), обёрнут в `AnimatePresence`
- Изображение: opacity + scale, spring stiffness 400, damping 30
- Смена фото анимируется через ключ `key={urls[index]}` — `AnimatePresence` переиспользуется для crossfade

### Confirm Dialog

**Файл:** `src/features/profile/components/ConfirmDialog.tsx`

- Оверлей: fade (duration 0.15)
- Диалог: opacity + scale + y, spring stiffness 400, damping 30
- `AnimatePresence` для появления/исчезновения

### Profile Tab Switch

**Файл:** `src/features/profile/components/ProfilePage.tsx`

Переключение табов с вертикальным слайдом:

```tsx
<motion.div
  key={activeTab}
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
/>
```

### Accent Color Picker

**Файл:** `src/features/profile/components/SettingsTab.tsx`

- Кнопка цвета: `whileTap={{ scale: 0.9 }}`
- Галочка выбранного цвета: scale 0→1, spring stiffness 500, damping 28

### MenuBar (Liquid Dock)

**Файл:** `src/components/layout/MenuBar.tsx`

Комплексная анимация нижней панели навигации:

- **Вход:** spring (stiffness 320, damping 26)
- **Тултип:** spring (stiffness 500, damping 30), `AnimatePresence` с fade + slide
- **Liquid dock effect:** каждая иконка масштабируется на `scaleForDistance()` при приближении курсора (MAGNET_RANGE = 120px, MAX_SCALE = 1.35). Анимация через spring (stiffness 320, damping 26)
- **Compact state:** вся панель сжимается до scale 0.78 при скролле вниз; восстанавливается при скролле вверх или наведении

---

## Spring Config Reference

| Use Case | Stiffness | Damping | Mass | Дополнительно |
|---|---|---|---|---|
| Page transition | — | — | — | Duration-based (0.25s) |
| Cursor tracking | 500 | 30 | 0.6 | Сглаживание позиции |
| Cursor hover scale | 400 | 20 | 0.6 | Расширение на hover |
| Dropdown (NotificationPanel) | 500 | 35 | — | — |
| Auth card entry | 300 | 30 | — | — |
| Feed stagger | 400 | 30 | — | Delay `i * 0.04` (max 0.3) |
| Lightbox / Dialog | 400 | 30 | — | — |
| Profile tab switch | 400 | 30 | — | — |
| MenuBar entry | 320 | 26 | — | — |
| MenuBar tooltip | 500 | 30 | — | — |
| MenuBar icons | 320 | 26 | — | Per-icon magnet scaling |
| Scroll progress | 120 | 30 | — | restDelta 0.001 |
| Morph heading | — | — | — | Duration-based (0.45s) |
| Accent checkmark | 500 | 28 | — | — |

---

## Accessibility

Проект использует два уровня защиты для `prefers-reduced-motion`:

**1. CSS guard:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Находится в `src/styles/index.css`. Отключает все CSS-анимации и переходы, когда пользователь включил `prefers-reduced-motion`.

**2. MotionConfig + useReducedMotion:**

- `MotionConfig reducedMotion="user"` в `main.tsx` — автоматическое поведение для всех `motion`-компонентов
- `useReducedMotion()` используется в:
  - `MorphHeading`: убирает blur и `y`, оставляет только fade
  - `AppShell`: заменяет spring-scroll на сырой `scrollYProgress`, отключает edge-fade оверлеи

Все `motion`-компоненты по умолчанию наследуют `reducedMotion="user"` от `MotionConfig`, поэтому ключевые анимации (PageTransition, stagger, dropdown) уважают системные настройки без дополнительной логики.
