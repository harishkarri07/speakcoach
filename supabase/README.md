# Supabase

## Migrations

There is **one canonical migration**:

```
supabase/migrations/20261005_speakcoach_schema.sql
```

It is fully idempotent, so it can be applied on a **fresh** project and re-applied
on a project that already ran either of the two older, conflicting migrations
(`20250101_initial_schema.sql` and the previous `20261005` file, which both created
the same tables with different columns). Divergent legacy columns are copied into the
canonical shape inside guarded `DO` blocks, then dropped.

The schema it produces matches `src/types/database.ts`:

| Table | Notes |
|---|---|
| `profiles` | `target_roles TEXT[]` plus `coach_tone`, `pacing_preference`, `filler_strictness` (CHECK-constrained), `domain_focus`, `target_role` |
| `sessions` | `mode` CHECK (11 coaching modes), `technical_domain` CHECK, `overall_score` CHECK 0–10 |
| `messages` | `user_id` (NOT NULL after backfill), `role` CHECK, UPDATE policy present |
| `streaks` | one naming pair: `current_streak` / `longest_streak` |
| `rewards` | global read-only catalog (`title`, `description`, `streak_required`, `xp_value`) |
| `reward_wallet` | per-user unlocks (`reward_id`, `custom_title`, `claimed_at`, `status`) |
| `daily_plan` | `plan_date`, `plan_data`, `is_completed`, unique per `(user_id, plan_date)` |
| `settings` | `store_audio` (default FALSE), `session_length_minutes`, `preferred_session_minutes`, `target_domains TEXT[]`, `theme` |

Every table has RLS enabled. Every `FOR ALL`/`UPDATE` policy carries **both**
`USING` and `WITH CHECK (auth.uid() = user_id)`. Policies are dropped by name
(all existing names) before being recreated, so the file is safe to re-run.

`handle_new_user()` is `SECURITY DEFINER` with `SET search_path = ''` and
schema-qualified table names; a shared `set_updated_at()` trigger maintains
`updated_at` on every table that has the column.

## Applying

### Option A — Supabase CLI

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B — Dashboard

Open **Supabase Dashboard → SQL Editor → New query**, paste the contents of
`20261005_speakcoach_schema.sql`, and **Run**. Running it a second time is a no-op.

## Regenerating TypeScript types

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/supabase.generated.ts
```

The hand-written `src/types/database.ts` is the source of truth for the app; if you
regenerate, reconcile it against the table above rather than replacing it wholesale.

## Environment

The browser only needs the public vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
The server verifies JWTs with `SUPABASE_URL` + `SUPABASE_ANON_KEY` (non-`VITE_`,
server-side only). Never commit `.env`.
