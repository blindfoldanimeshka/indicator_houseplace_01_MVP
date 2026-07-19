# Profile Redesign — Implementation

## What was built

A redesigned **ProfilePage** with four tabs:

- **Личные данные** (`PersonalInfoTab`) — name, bio, location, avatar upload.
- **Аккаунт** (`SettingsTab`) — email/password, notification & privacy toggles.
- **Подключения** (`ConnectionsTab`) — linked third-party services (`ConnectedService`).
- **Действия** (`DangerTab`) — logout and destructive account actions via `ConfirmDialog`.

Tab switching is managed by `ProfilePage` using local `useState`, rendering the
selected tab component from a `Record<TabId, () => ReactElement>` map.

## File structure

```
src/features/profile/
├── ProfilePage.tsx           # tab container + state
├── ProfileScreen.tsx        # screen wrapper
├── profileSchema.ts         # zod validation
├── components/
│   ├── PersonalInfoTab.tsx
│   ├── SettingsTab.tsx
│   ├── ConnectionsTab.tsx
│   ├── DangerTab.tsx
│   ├── AvatarUpload.tsx
│   ├── ConnectedService.tsx
│   └── ConfirmDialog.tsx
├── constants/profile.constants.ts
└── types/{profile.types,settings.types}.ts
```

## How to run

```bash
npm run dev         # local dev (http://localhost:5173)
npm run typecheck   # tsc -b
npm run lint        # eslint
npm test            # vitest (127 tests)
```

## Known limitations

- Settings and connections are **local-only UI** — no backend persistence yet.
  Toggles/services render but are not saved to Supabase.
- Avatar upload uses a local object URL preview, not real Storage upload.
- Account deletion/logout wiring to Supabase Auth is stubbed in `DangerTab`.
