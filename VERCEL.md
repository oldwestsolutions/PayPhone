# Vercel deployment

## Required: use latest `main`

Deploy commit **`55f5ba9` or newer**. Older commits (e.g. `ddbb2d4`) fail after install with:

`Cannot read properties of undefined (reading 'fsPath')`

because `apps/api` had no `package.json`.

## Recommended project settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js |
| **Build Command** | *(empty — use defaults)* |
| **Output Directory** | *(empty)* |
| **Install Command** | *(empty)* |

Redeploy with **Clear build cache** once after changing Root Directory.

## Legacy: Root Directory = `apps/api`

Still supported via stub `apps/api/package.json` + `apps/api/vercel.json`. Builds static files into `apps/web/out`.

## Repo root deploy

If **Root Directory** is empty (repository root), use root `vercel.json` (`outputDirectory`: `apps/web/out`).
