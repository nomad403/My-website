import { spawnSync } from "node:child_process"

// Workers Builds supplies WORKERS_CI=1. Plain Next builds remain available to
// local development and Vercel; OpenNext itself uses build:next to avoid recursion.
const script = process.env.WORKERS_CI === "1" ? "build:cloudflare" : "build:next"
console.log(`Build target: ${script}`)
const result = spawnSync(process.platform === "win32" ? "cmd.exe" : "npm",
  process.platform === "win32" ? ["/d", "/s", "/c", `npm run ${script}`] : ["run", script],
  { stdio: "inherit", env: process.env })
if (result.error) {
  console.error("Unable to start build:", result.error.message)
}
process.exit(result.status ?? 1)
