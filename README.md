# Workout

OTF-style workout tracker for the phone: treadmill HIIT intervals, stairmaster, strength, and stretching. It runs on GitHub Pages, with Supabase for data and password login.

## One-time setup

1. **Supabase**: create a free project at supabase.com.
   - SQL Editor: paste the **contents** of `supabase/schema.sql` and click Run, then do the same for `supabase/policies.sql`, then `supabase/seed.sql`.
   - Authentication → Users → **Add user**: enter your email + password and tick "Auto confirm".
   - Authentication → Sign In / Providers: turn **off** "Allow new users to sign up".
   - Project Settings → API: put the **Project URL** and the **anon / publishable key** in `.env.production`. Both are public by design; the login and database policies protect the data. Never use the secret / `service_role` key.
2. **GitHub**: push this repo to GitHub.
   - Settings → Pages → Source: **GitHub Actions**.
   - Every push to `main` deploys to `https://<you>.github.io/<repo>/`.
3. **Phone**: open the URL, sign in, then Share → **Add to Home Screen**.

Free Supabase projects pause after about a week with no activity. If yours pauses, restore it from the Supabase dashboard.

## Local dev

```sh
cp .env.example .env.local   # fill in your values
npm install
npm run dev
npm test
```
