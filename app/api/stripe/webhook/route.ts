import { NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { applyStoredBillingEvents } from "@/lib/db/billing-event"
import { constructStripeEvent, getStripe } from "@/lib/billing/stripe-gateway"
import { readStripeEnv } from "@/lib/billing/stripe-env"
import { readStripeSubscriptionState, toBillingNotices } from "@/lib/billing/stripe-map"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const stripe = readStripeEnv()
  if (!stripe || !process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, code: "stripe_unconfigured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
  const signature = request.headers.get("stripe-signature")
  const payload = await request.text()
  if (!signature) {
    return NextResponse.json(
      { ok: false, code: "signature_missing" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }
  let event: ReturnType<typeof constructStripeEvent>
  try {
    event = constructStripeEvent(stripe, payload, signature)
  } catch {
    return NextResponse.json(
      { ok: false, code: "signature_invalid" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }
  const notices = toBillingNotices(event)
  if (!notices.length) {
    return NextResponse.json({ ok: true, ignored: true }, { headers: { "Cache-Control": "no-store" } })
  }
  try {
    const result = await applyStoredBillingEvents(getDb(), notices, {
      reconcileSubscription: async (stripeSubscriptionId) => {
        const current = await getStripe(stripe.secretKey).subscriptions.retrieve(stripeSubscriptionId, {}, {timeout:5000,maxNetworkRetries:0})
        return readStripeSubscriptionState(current)
      },
    })
    if (result === "retry") {
      return NextResponse.json(
        { ok: false, code: "sync_pending" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      )
    }
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    console.error("[stripe] webhook failed")
    return NextResponse.json(
      { ok: false, code: "sync_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
