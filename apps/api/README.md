# Vercel stub (not an API)

Legacy Vercel projects may still use **Root Directory = `apps/api`**. This folder only contains `package.json` + `vercel.json` so the build can run.

**Recommended:** Vercel → Project Settings → General → **Root Directory = `apps/web`**, then delete this folder.

The real site is `apps/web` (static Next.js export). No Express.
