import QRCode from "qrcode"
import { cardProfile } from "@/lib/card/profile"

export const dynamic = "force-static"

export async function GET() {
  const svg = await QRCode.toString(cardProfile.cardUrl, {
    type: "svg", errorCorrectionLevel: "M", margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  })
  return new Response(svg, { headers: {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  } })
}
