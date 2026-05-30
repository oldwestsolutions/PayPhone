/**
 * Workaround when Vercel "Output Directory" is wrongly set to `apps/web/out`
 * while Root Directory is already `apps/web` (Vercel then looks for apps/web/apps/web/out).
 * Remove this script after clearing Output Directory in project settings.
 */
const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL) {
  process.exit(0);
}

const appRoot = path.join(__dirname, "..");
const src = path.join(appRoot, "out");
const dest = path.join(appRoot, "apps", "web", "out");

if (!fs.existsSync(src)) {
  console.error("[vercel-postbuild] Missing out/ after next build");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[vercel-postbuild] Copied out/ → apps/web/out");
