import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export const runtime = "nodejs"

const SIGNATURE_PATH = path.join(process.cwd(), "public", "images", "signature.png")

/** Same PNG and stable URL on both Node.js and Workers; no public filesystem in workerd. */
export async function GET(request: Request) {
  try {
    let assetBinding: ReturnType<typeof getCloudflareContext>["env"]["ASSETS"]
    try { assetBinding = getCloudflareContext().env.ASSETS } catch { /* Ordinary Node.js runtime. */ }
    let body: Uint8Array
    if (assetBinding) {
      const asset = await assetBinding.fetch(new URL("/images/signature.png", request.url))
      if (!asset.ok) return new NextResponse("Signature introuvable", { status: 404 })
      body = new Uint8Array(await asset.arrayBuffer())
    } else {
      body = new Uint8Array(await readFile(SIGNATURE_PATH))
    }
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return new NextResponse("Signature introuvable", { status: 404 })
  }
}
