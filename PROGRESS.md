# PROGRESS

Legend: ✅ written · 🧪 NOT yet verified on a device/database (see note) · ⏳ not implemented

> **Honesty note.** This code was written in an offline sandbox. TypeScript was only syntax-checked there; the SQL was
> **never executed against a real Postgres/Supabase**, and the app was **never run**. Everything marked 🧪 must be
> verified by you with the checklist in `DEMO.md` ("Smoke test"). Expect to fix a few small errors on first run.

## Priority 1 — must work
- [x] 1. Expo project setup (`setup.sh` generates it from the current Expo template) 🧪
- [x] 2. Navigation: welcome → auth → bottom tabs (Home, Groups, Leaderboard, Profile) + nested screens 🧪
- [x] 3. Authentication (register, login, logout, error messages, session persistence) 🧪
- [x] 4. Dashboard (greeting, date, current group, today's habits, progress bar, streak, strikes, skips, rank) 🧪
- [x] 5. Group creation and joining via invitation code; members; leader badge 🧪
- [x] 6. Habit creation (leader), assignment to all or chosen members 🧪
- [x] 7. Daily check-ins (Done / Failed / Skip), one per habit per day, enforced by DB constraint 🧪
- [x] 8. Strike system (failed, missing, rejected proof; de-duplicated by unique constraint) 🧪
- [x] 9. Consequence assignment at every N-th strike; member can mark complete 🧪
- [x] 10. Leaderboard computed live in SQL from check-ins 🧪

## Priority 2
- [x] 11. Skip allowance per member (remaining shown on Home and Accountability) 🧪
- [x] 12. Proof upload (camera/gallery → private Storage bucket → PENDING) 🧪
- [x] 13. Proof review (leader only, never own proof; reject = strike, no duplicates) 🧪
- [x] 14. Habit history list and profile statistics 🧪

## Priority 3
- [ ] 15. Push notifications ⏳ (not implemented)
- [~] 16. Deadline processing: **manual** leader button calls `process_missing_checkins`; no automatic scheduler ⏳
- [ ] 17. Advanced analytics ⏳
- [~] 18. Visual polish: consistent cards/colors, no animations ⏳

## Demo
- [x] Seed script + SQL (3 users, "30-Day Study Challenge", history, strikes, pending consequence) 🧪
- [x] Third-strike demo: Sam starts at 2 strikes; one failure triggers consequence; "Reset today" repeats it 🧪

## Known limitations
- A leader's own proof cannot be reviewed (rule: nobody reviews their own proof) → in a 1-leader group it stays PENDING.
- Missing check-ins are only recorded when a leader taps the button (or you schedule the function).
- When every consequence option has been used, assignment cycles through the list again.
- Joining a group later only auto-assigns habits that were created as "assign to all".
- No automated tests were written.
