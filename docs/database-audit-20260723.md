# БД Аудит и Харднинг — 2026-07-23

## Проект
- **Project**: `MVP-House` (`uwinrqeyixdnemszhxoj`)
- **Region**: `eu-north-1`
- **Postgres**: 17.6.1.147

---

## Что было найдено (Advisors)

### Security WARNINGS (до фиксов)

| Lint | Severity | Count | Description |
|------|----------|-------|-------------|
| `rls_enabled_no_policy` | INFO | 1 | `moderation_audit` — RLS включен, но 0 политик |
| `public_bucket_allows_listing` | WARN | 1 | Bucket `avatars` — лишняя SELECT policy на `storage.objects` |
| `anon_security_definer_function_executable` | WARN | 5 | 5 SECURITY DEFINER функций доступны anon без авторизации |
| `authenticated_security_definer_function_executable` | WARN | 7 | 7 SECURITY DEFINER функций доступны authenticated |
| `auth_leaked_password_protection` | WARN | 1 | HaveIBeenPwned проверка отключена в Auth |

### Performance WARNINGS (до фиксов)

| Lint | Severity | Count | Description |
|------|----------|-------|-------------|
| `unindexed_foreign_keys` | INFO | 9 | FK без покрывающих индексов |
| `auth_rls_initplan` | WARN | 7 | `auth.uid()` вместо `(select auth.uid())` в RLS — re-eval per row |
| `multiple_permissive_policies` | WARN | 3 | По 2 permissive SELECT политики на listings, org_members, organizations |
| `unused_index` | INFO | 15 | Индексы ни разу не использовались |

---

## Применённые миграции

### Миграция 1: `20260723_security_hardening`

**Security fixes:**
1. ✅ **Удалена `avatars_select_public` policy** — public bucket не нуждается в SELECT policy, файлы доступны по URL
2. ✅ **Revoke anon EXECUTE** на `enforce_listing_limit()`, `record_listing_view(uuid)`, `record_listing_response(uuid)` — эти функции не должны быть публичными RPC
3. ✅ **RLS на `moderation_audit`** — добавлена политика `Moderator self-read audit` для SELECT by moderator_id
4. ✅ **Fix `auth_rls_initplan`** — все 7 политик на `notifications` и `notification_prefs` переписаны с `auth.uid()` → `(select auth.uid())` (select-вариант для initplan optimization)
5. ✅ **Merge multiple permissive policies**:
   - `listings`: 2 → 1 SELECT политика (`listings_select_authenticated`) + отдельная для anon
   - `organizations`: 2 → 1 SELECT (`organizations_select`) + per-op owner policies
   - `organization_members`: 2 → 1 SELECT (`organization_members_select`) + per-op admin policies

### Миграция 2: `20260723_performance_indexes`

**Performance fixes:**
1. ✅ **9 индексов на FK**:
   - `funnel_events(user_id)`
   - `invites(created_by)`
   - `messages(sender_id)`
   - `moderation_audit(moderator_id)`
   - `organization_members(invited_by)`
   - `organizations(owner_id)`
   - `reports(reviewed_by)`
   - `reviews(reviewer_id)`
   - `subscriptions(plan_id)`

### Миграция 3: `20260723_fix_multiple_permissive`

**Split ALL into per-operation policies** чтобы избежать дублирования SELECT evaluation:
- `organizations_owner_all` (ALL) → разбита на `organizations_owner_insert/update/delete`
- `organization_members_admin_all` (ALL) → разбита на `organization_members_admin_insert/update/delete`
- SELECT осталась единой политикой на каждую таблицу

---

## Результат после фиксов

### Security — устранено
- ✅ `rls_enabled_no_policy` — moderation_audit теперь имеет политику
- ✅ `public_bucket_allows_listing` — avatars bucket SELECT policy удалена
- ✅ `auth_rls_initplan` — все 7 warnings исчезли
- ✅ `multiple_permissive_policies` — все 3 warnings исчезли
- ✅ `anon_security_definer_function_executable` — 3 из 5 функций (enforce_listing_limit, record_listing_view, record_listing_response) revoke'd от anon. `invite_status` и `is_invite_valid` оставлены intentional для invite flow

### Performance — устранено
- ✅ `unindexed_foreign_keys` — все 9 warnings исчезли
- ✅ `auth_rls_initplan` — исчезли (см. выше)
- ✅ `multiple_permissive_policies` — исчезли

### Оставшиеся warnings (intentional / не-SQL)

| Lint | Причина | Действие |
|------|---------|----------|
| `anon_security_definer_function_executable` (invite_status, is_invite_valid) | Intentional — используются в invite flow для незалогиненных пользователей | Оставлено |
| `authenticated_security_definer_function_executable` | Intentional — это RPC endpoint'ы (claim_invite, open_or_create_chat, record_listing_view, record_listing_response, invite_status, is_invite_valid) | Оставлено |
| `auth_leaked_password_protection` | Требует включения в Supabase Dashboard → Auth Settings → Leaked Password Protection | Вручную через UI |
| `unused_index` (15 шт.) | INFO уровень — новые индексы ещё не использовались; старые — возможно нужны для редких запросов. Удалять без анализа плана запросов рискованно | Отложено |

---

## Рекомендации

1. **Включить Leaked Password Protection** в Supabase Dashboard:
   Project Settings → Authentication → Password Security → Leaked Password Protection → ON

2. **Периодический аудит неиспользуемых индексов** через `pg_stat_user_indexes` после нескольких недель нагрузки:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0 AND schemaname = 'public';
   ```

3. **Проверить `notify_on_deal_closed`, `notify_on_new_chat`, `notify_on_new_message`** — они SECURITY DEFINER и вызываются из триггеров, но advisor их не отметил потому что не exposed через RPC. Убедиться что они не в `public` schema или revoke'd.

4. **Добавить `role` enum в `users`** если планируется moderation/admin ролевая модель — сейчас `moderation_audit` политика полагается только на `moderator_id`.
