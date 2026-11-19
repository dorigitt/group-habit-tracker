# ARCHITECTURE

```
Expo app (React Native, TS)  ──supabase-js──▶  Supabase
  app/    screens (Expo Router)                  Auth      email+password, JWT
  lib/    api.ts (all backend calls)             Postgres  tables + RLS + SQL functions
          auth.tsx, groups.tsx (context)         Storage   private bucket "proofs"
  components/ui.tsx (shared widgets)
```

## Communication
- **Reads**: `supabase.from(table).select(...)`. RLS allows `SELECT` only for members of the row's group
  (`is_member(group_id)`); profiles are visible to yourself and people sharing a group.
- **Writes**: no insert/update/delete policies exist for the client. Every change goes through `supabase.rpc(...)` to a
  `SECURITY DEFINER` function that checks `auth.uid()` and the business rules.
- **Photos**: uploaded to `proofs/<group_id>/<user_id>/<file>.jpg`. Storage policies: you may upload only into your own
  folder of a group you belong to; you and that group's leaders may read. The app shows photos via 5-minute signed URLs.

## Data model
profiles · groups · memberships(role LEADER|MEMBER) · group_consequences (agreed options) · habits ·
habit_assignments · check_ins · proofs · evidence_reviews · strike_events · consequence_assignments.

Key constraints: `unique(assignment_id, check_date)` (one check-in per habit per day), `unique(check_in_id, reason)` on
strikes (no duplicate strikes), `unique(proof_id)` on reviews, `unique(group_id, user_id, milestone)` on consequences.

## Business rules (all in `001_schema.sql`)
| Rule | Where |
|---|---|
| Failed → 1 strike | `submit_check_in` → `apply_strike` |
| Missing after deadline → 1 strike | `process_missing_checkins` (manual trigger) |
| Skip: no strike, limited allowance | `submit_check_in` + `skips_remaining` |
| Rejected proof → FAILED + 1 strike, once | `review_proof` + strike unique key |
| Every N strikes → 1 consequence | `apply_strike` (count % threshold = 0), prefers unused options |
| No self-review, leader-only review | `review_proof` |
| Leaderboard from real records | `get_leaderboard`, `user_streak` |

"Today" is computed in the group's timezone (stored at creation) both in the DB (`group_today`) and the client
(`todayIn`), so the date shown matches the date the DB uses.

## Demo seeding
`002_demo_seed.sql` defines `seed_demo_group` (executable by `service_role` only). `scripts/seed-demo.mjs` runs on your
computer with the service-role key, creates three auth users via the Admin API and calls that function.
`groups.is_demo` marks the group; `demo_reset_today` only works for such groups.

## Not built / extension points
- Scheduler: run `process_missing_checkins` per group nightly with `pg_cron` or a Supabase Edge Function.
- Push notifications (`expo-notifications`), analytics, dark mode, tests.
- Leader-managed consequence editing after group creation (options are set at creation only).
