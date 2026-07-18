# Design: Deferred Phase 3 — legal pages, consent, password reset (MVP «напрямую»)

- Date: 2026-07-19
- Status: approved (autonomous mode per user instruction)
- Roadmap ref: technical-specification-roadmap.md §4.1, §8 task 5 (email confirmation OK by default; CAPTCHA/SMTP deferred to provider decision)

## Goal

Close the deferred part of Phase 3 that is implementable in code without
external paid keys: (1) password reset flow, (2) legal pages (privacy policy,
terms) + a consent checkbox at sign-up, as required by §4.1 and §8 before any
public launch. CAPTCHA and custom SMTP are OUT of scope here (require external
provider keys / a service decision) — noted as TODO in docs/progress.

## Scope (YAGNI)

- No CAPTCHA widget (needs hCaptcha/Turnstile sitekey+secret — user decision).
- No custom SMTP (Supabase default sender is fine for closed beta; note in docs
  that production needs a dedicated SMTP per §4.1).
- Email confirmation is already enforced by Supabase default + client guard.

## Success criteria

1. Authenticated or not, a user can request a password reset email via
   `supabase.auth.resetPasswordForEmail(email, { redirectTo })`; UI shows
   "Письмо отправлено" and a clear error on failure.
2. Legal pages exist at routes/paths `/privacy` and `/terms` (or simple views),
   linked from AuthScreen and the app footer. Content is placeholder Russian
   text clearly marked "шаблон, требует юридической проверки".
3. Sign-up requires checking a consent box ("Я согласен на обработку
   персональных данных согласно Политике конфиденциальности") — submit disabled
   until checked; links to the legal pages open in a new tab.
4. Error paths show safe Russian messages; rate-limit (429) surfaced gently.

## Architecture

- `src/features/auth/LegalPages.tsx` (or `src/features/legal/`) — `PrivacyPolicy`
  and `TermsOfService` simple views (static text, back button). Wire as views in
  App (view-state `privacy` | `terms`) or as routes if simpler — keep view-state.
- `src/features/auth/AuthScreen.tsx` — add "Забыли пароль?" toggle with email
  input → `resetPasswordForEmail`; add consent checkbox on the register form.
- `src/features/auth/authApi.ts` (or extend provider) — `resetPassword(email)`:
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/` })`
  returns `{ error }`. Map 429 to a friendly message.
- `src/app/App.tsx` — add view-state entries `privacy`, `terms`; footer/nav links.
- `src/lib/env.ts` — optionally read `VITE_TURNSTILE_SITEKEY` if present (for
  future CAPTCHA); not required now. Skip if not needed.

## Data flow

Reset: AuthScreen → resetPassword(email) → Supabase sends email → UI confirms.
Consent: checkbox state gates the register submit; value not stored (consent is
implicit by account creation + legal text). For MVP this satisfies §4.1 intent;
a signed consent record can be added later.

## Validation

Zod: consent must be true to submit register; email valid for reset.

## Error handling

All auth calls return `{ error }`; UI shows safe messages. Reset: success and
error states. Consent: disabled submit until checked.

## Testing (qa-engineer)

- Unit `authApi.resetPassword` with mocked supabase: calls
  `resetPasswordForEmail` with email + redirectTo; maps 429.
- Component AuthScreen: register submit disabled until consent checked; opens
  legal links; "Забыли пароль" flow shows confirmation.
- Keep all existing tests green; target ≥5 new tests.

## Rollout

frontend-dev builds reset + legal + consent; qa-engineer adds tests; run
lint/typecheck/test; commit. Push on user request. CAPTCHA/SMTP left as TODO
in docs/progress with the exact provider decision needed.
