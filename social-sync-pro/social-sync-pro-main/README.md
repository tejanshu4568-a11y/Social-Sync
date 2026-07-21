# Broadcast (social-sync-pro)

Compose once, schedule everywhere — a small studio for planning posts across
LinkedIn, X and Instagram. Built with [TanStack Start](https://tanstack.com/start)
(React) and [Supabase](https://supabase.com) (auth + Postgres).

This project was originally scaffolded in Lovable and has since been
disconnected from it — see **What changed** below if you're curious.

## Run it locally

You'll need [Node.js](https://nodejs.org) 20+ and a Supabase project.

```bash
npm install
cp .env.example .env   # then fill in your Supabase project's values (see below)
npm run dev
```

Open the printed `localhost` URL. That's it — no Lovable account, no Lovable
CLI, nothing beyond Node and your own Supabase project.

### Getting your Supabase values

1. Create a free project at [supabase.com](https://supabase.com) if you don't
   have one, or use your existing `xjbgzyneqiyvnflogyaf` project from before.
2. Go to **Project Settings → API** and copy the **Project URL**, **Project
   ID**, and the **`publishable`** key (not the `secret` one) into `.env`.
3. Run the SQL files in `supabase/migrations/` against your database, in
   order — either by pasting each into the Supabase SQL Editor, or with the
   [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase db push`).
   If you're reusing the same Supabase project this app already had, only
   the newest migration (`20260720120000_client_side_publish_results.sql`)
   is new and needs to be applied.

### Optional: Google sign-in

Email/password sign-in works with zero extra setup. Google sign-in needs the
Google provider turned on in your Supabase dashboard:
**Authentication → Providers → Google** (you'll need a Google Cloud OAuth
client ID/secret — Supabase's docs walk through this). If you skip this,
email/password sign-in still works fine.

## Deploy to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys this
automatically on every push to `main`. Setup is one-time:

1. **Push this to a GitHub repo.**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
   (Create the empty repo on GitHub first, via github.com/new — don't
   initialize it with a README there, to avoid a merge conflict with this one.)

2. **Add your Supabase values as repository secrets** — Settings → Secrets
   and variables → Actions → New repository secret. Add all three:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

   (These get baked into the built JS bundle at build time — that's normal
   and safe. Supabase's "publishable" key is meant to be public; your data
   is protected by Row Level Security, not by hiding this key.)

3. **Turn on Pages** — Settings → Pages → Source: **GitHub Actions**.

4. **Push again** (or re-run the workflow from the Actions tab) to trigger a
   deploy. Once it finishes, your site is live at
   `https://<your-username>.github.io/<your-repo>/`.

5. **Add that URL to Supabase's allow-list** — Authentication → URL
   Configuration → Redirect URLs, add
   `https://<your-username>.github.io/<your-repo>/**`. Without this, sign-up
   confirmation emails and Google sign-in will redirect somewhere Supabase
   refuses to send them back to.

After that, every push to `main` redeploys automatically — no manual steps.

## What changed (Lovable → standalone)

- Removed the `@lovable.dev/*` packages, the `.lovable/` folder, and the
  Lovable error-reporting hook. Google sign-in now goes through Supabase's
  own OAuth instead of Lovable's broker.
- `vite.config.ts` no longer depends on Lovable's config preset — it's a
  plain TanStack Start + Vite config now, with **SPA mode** turned on.
- **Why SPA mode:** this app was built with TanStack Start, a full-stack
  framework — parts of it (a cron-triggered publish endpoint, a service-role
  database client) are genuine server code. GitHub Pages only serves static
  files; it can't run a server at all. SPA mode prerenders a static shell
  that hydrates into a full app in the browser, and the app's data layer
  (`src/lib/posts.functions.ts`, `src/lib/accounts.functions.ts`) now talks
  to Supabase directly from the browser instead of through server functions
  — safe, because every table's Row Level Security already scopes each user
  to their own rows.
- **The one real trade-off:** the scheduled auto-publish cron job
  (`src/routes/api/public/cron/publish.ts`) needs a live server to run on a
  schedule, which static hosting can't provide. It's untouched in the repo
  but won't fire on GitHub Pages. This isn't a functionality regression
  today — publishing to LinkedIn/X/Instagram is still a simulated stub (see
  `src/lib/publisher.client.ts`), not real API calls, so nothing that
  currently works for real is lost.
- **"Post now"** still works — it's simulated client-side now
  (`src/lib/publisher.client.ts`) instead of on the server
  (`src/lib/publisher.server.ts`, kept in the repo but unused by the GitHub
  Pages build).

### If you want real scheduled publishing later

The cleanest fit is a [Supabase Edge Function](https://supabase.com/docs/guides/functions)
— it runs on Supabase's own infrastructure (separate from GitHub Pages), can
be woken up by `pg_cron` on a schedule, and can hold real OAuth tokens
without ever exposing them to the browser. `src/lib/publisher.server.ts` and
`src/lib/crypto.server.ts` are a solid starting point for that function's
logic. At that point, also tighten `post_results`' Row Level Security back
down (see the comment in `supabase/migrations/20260720120000_client_side_publish_results.sql`)
so only that trusted function can write results, not a user's browser.
