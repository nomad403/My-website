import { createHash } from "node:crypto"
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

// Official v1.7.0 release asset digests from usestrix/strix.
const version = "1.7.0"
const assets = {
  "linux-x64": ["linux-x86_64", "b8cd7e84d63cbeff6726301a9e08fddedf40fc6a4edcdb4edda8a853b3312de6"],
  "linux-arm64": ["linux-arm64", "9f4a826c5d1e76b5c503e3299807af8549acca2e03734b6603611be275917ede"],
  "darwin-x64": ["macos-x86_64", "e425f000044741a9bebbedb265ef66efeabba48e45ac15374b1df9c092b5df3e"],
  "darwin-arm64": ["macos-arm64", "26607010b1822a7a7b0353d372cc00be149f91d1382e8a99df96ab4335afc6a0"],
}
const root = fileURLToPath(new URL("../", import.meta.url))
const asset = assets[`${process.platform}-${process.arch}`]
if (!asset) throw new Error("Plateforme non prise en charge par cet installateur. Voir https://github.com/usestrix/strix")
const [platform, expectedHash] = asset
const member = `strix-${version}-${platform}`
const temporary = mkdtempSync(join(tmpdir(), "website-strix-"))

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} a échoué (${result.status}).`)
}

try {
  // An optional pre-downloaded archive must pass the same digest verification.
  const archive = process.argv[2] ? resolve(process.argv[2]) : join(temporary, "strix.tar.gz")
  if (!process.argv[2]) {
    run("curl", ["--fail", "--location", "--retry", "2", "--max-time", "300",
      `https://github.com/usestrix/strix/releases/download/v${version}/${member}.tar.gz`, "--output", archive])
  }
  const hash = createHash("sha256").update(readFileSync(archive)).digest("hex")
  if (hash !== expectedHash) throw new Error("Somme SHA-256 incorrecte : installation annulée.")
  run("tar", ["-xzf", archive, "-C", temporary, member])
  const destination = join(root, ".tools", "strix")
  mkdirSync(destination, { recursive: true })
  const binary = join(destination, "strix")
  const staged = `${binary}.${process.pid}.tmp`
  try {
    copyFileSync(join(temporary, member), staged)
    chmodSync(staged, 0o755)
    renameSync(staged, binary)
  } finally {
    rmSync(staged, { force: true })
  }
  console.log(`Strix ${version} installé dans ${binary}`)
  console.log("Vérifier les prérequis : npm run security:check")
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
