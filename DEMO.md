# DEMO GUIDE

## One-time seeding
1. Supabase: run both migrations (README step 3).
2. `cp .env.seed.example .env.seed`, fill `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API).
3. `node --env-file=.env.seed scripts/seed-demo.mjs`

The script creates (or reuses) three accounts and recreates **only** the group "30-Day Study Challenge" (invite code
`DEMO30`). Real users and groups are never touched. Re-run it any time to restore the starting state.

| Account | Password | Role | Starting state |
|---|---|---|---|
| demo.alex@example.com | DemoPass123! | Leader | 1 strike, streak 3, high completion |
| demo.sam@example.com | DemoPass123! | Member | **2 strikes**, 1 skip used, streak 2 |
| demo.jordan@example.com | DemoPass123! | Member | 5 strikes, 1 consequence already assigned (pending), streak 0 |

History covers the previous 7 days; **today is empty** so you can check in live. Habits: Study for 2 hours,
Read 20 pages, Exercise for 30 minutes (📷 proof required).

## Suggested 6-minute walkthrough
1. **Welcome → Log in** as Alex. Dashboard: progress, streak, strikes, skips, rank.
2. **Leaderboard**: three different rankings, all computed from check-ins (explain `get_leaderboard`).
3. **Groups → 30-Day Study Challenge**: members, leader badge, invite code, agreed consequences.
4. Alex taps **Done** on Study and Read. (Try tapping again: it's blocked — one check-in per day.)
5. Log out, log in as **Sam**. Accountability: 2 strikes, "1 more strike until your next consequence".
6. **Third-strike demo (no waiting):** on Home tap **Failed** on "Study for 2 hours" → confirm. Alert appears:
   consequence assigned. Open **Accountability**: strike #3, a pending consequence → **Mark as completed**.
7. Sam does **Exercise → Done**, picks a photo → status "Proof pending".
8. Log in as Alex → Group → **Review proof photos** → Approve (or Reject to show the extra strike).
   Mention: a user can't approve their own proof; a rejection only ever creates one strike.
9. Show **Habit history** and the security story: log in as a fresh account, it sees no data of the demo group
   until it joins with `DEMO30` (RLS).

## Repeating the demo
- Group screen → **Demo tools → Reset my check-ins for today** (only exists for the flagged demo group; it removes only
  your own check-ins for today and any consequence that depended on them), or re-run the seed script.

## What to say honestly
- Deadline processing is a manual leader button (`process_missing_checkins`); a scheduler is future work.
- The demo group and its history are produced by a clearly labeled seed script, not hardcoded in the app.

## Smoke test (do this the day before — nothing has been run yet)
- [ ] Sign up a new user; profile row appears; log out/in
- [ ] Create group; invite code shown; join from a second account
- [ ] Create habit (with and without proof); both appear on the other member's Home
- [ ] Done/Failed/Skip each work; second attempt is rejected
- [ ] Third failure creates exactly one consequence
- [ ] Photo upload + approve/reject works
- [ ] Seed script runs twice without errors
