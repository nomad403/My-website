import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { spawnSync } from "node:child_process"
import { parseEnv } from "node:util"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const binary = join(root, ".tools", "strix", "strix")
const configuration = join(root, ".env.strix")
const env = { ...process.env }
if (existsSync(configuration)) {
  const local = parseEnv(readFileSync(configuration, "utf8"))
  for (const key of ["STRIX_LLM", "LLM_API_KEY", "LLM_API_BASE"]) {
    if (!env[key] && local[key]) env[key] = local[key]
  }
}

function prerequisites() {
  const checks = [
    [existsSync(binary), "Binaire Strix (npm run security:install)"],
    [spawnSync("docker", ["info"], { stdio: "ignore", timeout: 15000 }).status === 0,
      "Docker installé, démarré et accessible"],
    [Boolean(env.STRIX_LLM), "Modèle STRIX_LLM configuré dans .env.strix"],
    [Boolean(env.LLM_API_KEY), "Clé LLM_API_KEY configurée dans .env.strix"],
  ]
  for (const [ok, label] of checks) console.log(`${ok ? "OK" : "MANQUANT"} — ${label}`)
  return checks.every(([ok]) => ok)
}

function copySources() {
  const files = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024,
  })
  if (files.error) throw files.error
  if (files.status !== 0) throw new Error("Impossible de lister les sources avec Git.")
  const workspaces = join(root, ".tools", "strix", "workspaces")
  mkdirSync(workspaces, { recursive: true })
  const workspace = mkdtempSync(join(workspaces, "scan-"))
  for (const relative of new Set(files.stdout.split("\0").filter(Boolean))) {
    if (/^(?:\.git|\.aws|\.codex|\.agents|\.vscode|\.tools|\.next|node_modules|strix_runs)(?:\/|$)/.test(relative)) continue
    if (basename(relative).startsWith(".env")) continue
    const source = join(root, relative)
    // Deleted tracked files and symlinks are not copied into the audit workspace.
    if (!existsSync(source) || !lstatSync(source).isFile()) continue
    const destination = join(workspace, relative)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(source, destination)
  }
  console.log(`Copie des sources pour l'audit : ${workspace}`)
  return workspace
}

const [command, ...args] = process.argv.slice(2)
if (command === "doctor") {
  process.exitCode = prerequisites() ? 0 : 1
} else {
  let cliArgs = process.argv.slice(2)
  if (command === "scan") {
    if (args.length) throw new Error("security:scan audite le dépôt local. Utiliser security:strix pour les options personnalisées.")
    if (!prerequisites()) process.exit(1)
    cliArgs = ["--target", copySources(), "--scan-mode", "quick", "--instruction-file", join(root, "docs", "STRIX-SCOPE.md")]
  }
  if (!existsSync(binary)) {
    console.error("Strix absent. Exécuter : npm run security:install")
    process.exit(1)
  }
  const result = spawnSync(binary, cliArgs, { cwd: root, env, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.signal) process.kill(process.pid, result.signal)
  else process.exitCode = result.status ?? 1
}
