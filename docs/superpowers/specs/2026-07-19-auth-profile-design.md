# Design: Phase 3 — Auth and Profile (MVP «напрямую»)

- Date: 2026-07-19
- Status: approved (autonomous mode per user instruction)
- Roadmap ref: technical-specification-roadmap.md §4.1, §7 Phase 3, §8 task 5
- Stack: React 19 + Vite + TypeScript + Tailwind 4 + Zod, Supabase JS v2 client

## Goal

A secure sign-up / sign-in flow backed by Supabase Auth, plus a profile
screen, so that a registered user owns a `public.users` row and can later
create listings and chat. This is the minimal vertical slice that unblocks
Phase 4 (listings) which requires a current authenticated user.

## Non-goals (YAGNI)

- CAPTCHA, custom SMTP, password reset UI, phone/Telegram login, legal pages
  (roadmap Phase 3 items beyond the MVP slice; deferred unless requested).
- Social login providers.

## Success criteria

1. A visitor can register with email + password; on success Supabase creates
   the auth user AND the `public.users` profile row (via existing
   `on_auth_user_created` trigger).
2. A registered user can sign in and is shown the app shell (not the auth
   screen).
3. Session survives reload (read via `getSession`, kept in sync with
   `onAuthStateChange`).
4. An unconfirmed-email user can fill the profile but cannot publish content
   (guard enforced client-side; DB already restricts writes to authenticated).
5. The user can edit `name` (1–100) and `city` (≤100) and sign out.
6. Email confirmation is enabled in Supabase (default on); the UI tells the
   user to confirm their email before publishing.

## Architecture

Auth state lives in a single React context provider (`AuthProvider`) at the
app root. It exposes `session`, `user`, `isLoading`, and actions
(`signUp`, `signIn`, `signOut`, `updateProfile`). The App component switches
between `<AuthScreen>` and `<AppShell>` based on session presence.

No react-router; navigation stays view-state based (existing pattern).

### Files

- `src/features/auth/AuthProvider.tsx` — context, session bootstrap,
  `onAuthStateChange` subscription, actions. New.
- `src/features/auth/useAuth.ts` — hook returning the context. New.
- `src/features/auth/AuthScreen.tsx` — register/login form with Zod validation
  and inline error states. New.
- `src/features/profile/ProfileScreen.tsx` — edit name/city, sign out. New.
- `src/features/profile/profileSchema.ts` — Zod schema for profile fields. New.
- `src/app/App.tsx` — consume `useAuth`, render AuthScreen vs AppShell. Edit.
- `src/lib/supabase.ts` — reuse existing client. No change.

### Data flow

1. `AuthProvider` mounts → `getSession()` initializes state.
2. `onAuthStateChange` updates state on SIGNED_IN / SIGNED_OUT / USER_UPDATED.
3. Register calls `supabase.auth.signUp({ email, password, options: { data: { name, city } } })`.
   Trigger `on_auth_user_created` inserts into `public.users`.
4. Sign in calls `supabase.auth.signInWithPassword({ email, password })`.
5. Update profile calls `supabase.from('users').update({ name, city }).eq('id', userId)`.

### Validation (Zod, client UX)

- email: valid email string
- password: min 8 chars
- name: trim, 1–100 chars
- city: trim, 0–100 chars

### Error handling

Every action returns `{ error }`; UI shows the message. Loading and error
states on all forms. Guard: if `!user.email_confirmed_at`, show a notice that
publishing is disabled until confirmation.

### Testing (qa-engineer)

- Unit: `AuthProvider` signUp/signIn/signOut with mocked supabase client
  (Vitest + Testing Library).
- Component: AuthScreen renders, validates, switches on success.
- Keep existing `npm test` green.

## Rollout

Implement via role subagents (frontend-dev builds UI + provider; qa-engineer
adds tests), run `npm run lint`, `npm run typecheck`, `npm test`, then commit.
Push only if user requests.
