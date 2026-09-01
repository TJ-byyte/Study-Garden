# 🌱 Study Garden

A gamified daily-study tracker you host yourself.

- **Living streak plant** — study every day and it grows seed → sprout → seedling → sapling → tree. The more of your daily checklist you finish, the faster it grows. Miss **3 days in a row** and it withers; you start again from a seed.
- **Contribution heatmap** — a GitHub-style calendar of every active day, shaded by how much of the checklist you completed.
- **Daily checklist** — add your own recurring tasks in the app; they reset fresh each day.
- **Cloud sync** — one passcode unlocks the same garden on your phone and laptop. Works offline and syncs when it can.

The app is a single static `index.html`. Sync is one Vercel serverless function (`/api/garden`) backed by one row in Supabase, guarded by a shared passcode.

---

## Setup

### 1. Supabase (the database)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query**, paste the contents of [`supabase-schema.sql`](./supabase-schema.sql), and **Run**.
3. **Project Settings → API** and copy two things:
   - **Project URL** → `https://xxxxxxxx.supabase.co`
   - **`service_role` secret** (under *Project API keys* — the secret one, *not* `anon`). Keep this private; it goes only into Vercel.

### 2. GitHub

1. Create a new **empty** repository (no README / .gitignore / license).
2. From this folder:
   ```bash
   git init
   git add -A
   git commit -m "Study Garden"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

### 3. Vercel (hosting + the sync API)

1. At [vercel.com](https://vercel.com) → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Other**. No build command, no output directory — it's a static site with an `api/` folder.
3. **Environment Variables** — add all three:

   | Name | Value |
   |---|---|
   | `GARDEN_PASSCODE` | a long random passphrase you invent (this is what you type in the app) |
   | `SUPABASE_URL` | your Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase `service_role` secret |

4. **Deploy**. You get a URL like `https://study-garden-xxxx.vercel.app`.

### 4. Use it

1. Open the Vercel URL on your laptop. Open **Settings → Cloud sync**, enter your `GARDEN_PASSCODE`, tap **Connect**.
2. Open the same URL on your phone, add it to the home screen, enter the same passcode.
3. Study. 🌿

---

## How sync works

- Every change is saved locally first (the app is fully usable offline).
- Changes are pushed to Supabase a moment later, and pulled when the app opens or regains focus.
- Merge rule: day-completions from both devices are **unioned** (a checkmark made anywhere survives); your task list is taken from whichever device saved most recently. Growth, streak, stage and "plants lost" are all recomputed from that merged history, so the two devices always converge.

## Changing the passcode

Update `GARDEN_PASSCODE` in Vercel → redeploy → reconnect in the app on each device.

## Local development

`npx vercel dev` runs the static site and the function together on `localhost:3000` (needs the three env vars in a `.env.local` file).
