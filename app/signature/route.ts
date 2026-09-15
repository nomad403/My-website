import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SIGNATURE_PATH = path.join(
  process.cwd(),
  "public",
  "images",
  "signature.png",
)

/** Image de signature mail — URL stable pour les clients mail. */
export async function GET() {
  try {
    const body = await readFile(SIGNATURE_PATH)
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
