# 🌱 Study Garden

A gamified daily-study tracker. Anyone can sign in and grow their own garden.

- **Living streak plant** — study every day and it grows seed → sprout → seedling → sapling → tree. The more of your daily checklist you finish, the faster it grows. Miss **3 days in a row** and it withers; you start again from a seed.
- **Contribution heatmap** — a GitHub-style calendar of every active day, shaded by how much of the checklist you completed.
- **Daily checklist** — add your own recurring tasks in the app; they reset fresh each day.
- **Accounts** — sign in with GitHub and your garden syncs across every device. Or use it as a guest with no account (data stays on that one device); sign in later and the guest garden moves into your account.

The whole app is a single static `index.html`. There is **no server code** — the
browser talks straight to Supabase using the public anon key, and Supabase
Row-Level Security keeps each person's garden private.

---

## Architecture

```
Browser (index.html + supabase-js)
   │  anon key + the signed-in user's JWT
   ▼
Supabase  ──  Auth (GitHub OAuth)
          ──  Postgres table `public.gardens`  (one row per user_id, RLS-guarded)
```

Hosting is any static host; this project uses Vercel (auto-deploys on push to
`main`). No environment variables, no `/api` folder.

---

## Setup

### 1. Supabase — database

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste [`supabase-schema.sql`](./supabase-schema.sql), **Run**.
3. **Project Settings → API** → copy the **Project URL** and the **`anon` `public`** key.
   (The `anon` key is safe to commit — it only works together with RLS and a real login.)

### 2. Supabase — GitHub sign-in

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   (<https://github.com/settings/developers>):
   - **Application name:** Study Garden
   - **Homepage URL:** `https://<your-site>.vercel.app`
   - **Authorization callback URL:** `https://<project-ref>.supabase.co/auth/v1/callback`
   - Register, then **Generate a new client secret**. Copy the **Client ID** and
     **Client secret**.
2. **Supabase → Authentication → Providers → GitHub:** enable, paste Client ID +
   secret, save.
3. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** `https://<your-site>.vercel.app`
   - **Redirect URLs:** add `https://<your-site>.vercel.app/**`

That's the whole OAuth setup — no consent screen, no verification, no scopes to
configure.

### 3. Configure the app

In [`index.html`](./index.html), set the two constants near the top of the
`<script>`:

```js
var SUPABASE_URL = "https://<project-ref>.supabase.co";
var SUPABASE_ANON_KEY = "<your anon public key>";
```

### 4. GitHub + Vercel

```bash
git add -A && git commit -m "Study Garden" && git push
```

At [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
Framework preset **Other**, no build command, no output directory, **no
environment variables**. Deploy.

### 5. First run + migrating an existing garden

1. Open the site, **Sign in with GitHub** once. That creates your account and an
   empty `gardens` row.
2. If you are moving over from the old passcode version, run the one-time
   migration at the bottom of [`supabase-schema.sql`](./supabase-schema.sql)
   (edit the email first) in the SQL Editor. Reload the app.

---

## How sync works

- Every change saves to `localStorage` first — the app is fully usable offline
  and as a guest.
- When you are signed in, changes push to your `gardens` row a moment later, and
  pull on load and when the tab regains focus.
- Merge rule: day-completions from every device are **unioned** (a checkmark made
  anywhere survives); your task list is taken from whichever device saved most
  recently. Growth, streak, stage and "plants lost" are recomputed from the
  merged history, so devices converge.
- Signing in as a guest folds the guest garden into your account. Signing out
  clears the local copy on that device (your data is safe in the cloud).

## Local development

Open `index.html` directly, or serve the folder with any static server
(`npx serve`). OAuth redirects only work from an origin listed in the GitHub
OAuth app + Supabase URL config, so add `http://localhost:3000/**` there if you
want to test sign-in locally.
