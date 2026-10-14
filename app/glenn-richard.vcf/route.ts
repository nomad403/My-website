import { cardProfile } from "@/lib/card/profile"
import { generateVCard } from "@/lib/card/vcard"

export const dynamic = "force-static"

export function GET() {
  return new Response(generateVCard(cardProfile), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="glenn-richard.vcf"',
      "X-Content-Type-Options": "nosniff",
    },
  })
}
