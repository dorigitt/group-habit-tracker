# Group Habit Tracker

React Native (Expo, TypeScript, Expo Router) + Supabase (Postgres, Auth, Storage, RLS).
Friends form a group, check in on shared habits daily, collect strikes for failures, and owe an agreed, voluntary
consequence at every 3rd strike. Rankings are computed from real check-in records.

> Status: written but not yet run. See `PROGRESS.md` for what is verified (nothing yet) and `DEMO.md` for a smoke test.

## 1. Prerequisites (macOS)
- Node.js 20.6+ (`brew install node`), check with `node -v`
- A free Supabase account: https://supabase.com
- iPhone: install **Expo Go** from the App Store (same Wi-Fi as your Mac)
- Android emulator (optional): Android Studio → Device Manager → create a Pixel device

## 2. Create the app
```bash
chmod +x setup.sh
./setup.sh habit-app        # creates ./habit-app with our code on top of a fresh Expo template
cd habit-app
```
(`setup.sh` uses the *current* Expo template so package versions match your Expo Go. If a step fails, read the message;
the script is short and commented.)

## 3. Connect Supabase
1. Supabase dashboard → **New project**.
2. **SQL Editor** → run `supabase/migrations/001_schema.sql`, then `002_demo_seed.sql`.
3. **Authentication → Providers → Email**: for the demo turn **off** "Confirm email" (otherwise new accounts need an email click).
4. **Project Settings → API**: copy *Project URL* and the *anon public* key into `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   Never put the `service_role` key in `.env` or in the app.
5. Check Storage: a private bucket named `proofs` should exist (the migration creates it).

## 4. Run
```bash
npx expo start -c
```
- **iPhone / Expo Go**: scan the QR code with the Camera app. Same Wi-Fi required (or use `npx expo start --tunnel`).
  If Expo Go says the SDK is incompatible, update Expo Go from the App Store.
- **iOS Simulator**: press `i` (needs Xcode). **Android emulator**: start the emulator, press `a`.

## 5. Demo data
See `DEMO.md`. Short version:
```bash
cp .env.seed.example .env.seed      # add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (your computer only!)
npm install --no-save @supabase/supabase-js   # already installed by setup.sh
node --env-file=.env.seed scripts/seed-demo.mjs
```

## 6. How it fits together
Mobile app → `supabase-js` → (a) `select` queries on tables (read-only through RLS) and (b) `rpc()` calls to Postgres
functions that enforce every rule (strikes, skips, proof review). Details in `ARCHITECTURE.md`.

## 7. Feature status (honest)
Written in full: auth, groups/join code, habits, check-ins, strikes, consequences, skips, leaderboard, proof upload/review,
history, profile. **None of it has been executed yet**, so treat it as "implemented, awaiting your first run".
Not implemented: push notifications, automatic deadline processing (manual leader button instead), advanced analytics,
animations, automated tests.

## Troubleshooting
- *"Supabase is not configured"* → `.env` missing/empty; restart with `npx expo start -c`.
- *"permission denied for function ..."* → migration 001 did not finish; rerun it on a fresh project.
- *Invalid login right after sign-up* → email confirmation is still on (step 3.3).
- *Photos fail to upload* → confirm the `proofs` bucket and its two policies exist.
