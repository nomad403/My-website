# Shop production checklist

Production D1: `nomad403-prod` (`a5f76558-e7c4-4ca6-bd3a-c1f87243a6df`).  
Preview D1 stays `nomad403-shop-qualification` (`2eb5526a-…`) — never share data.

Runtime gate: [`lib/auth/runtime.ts`](../lib/auth/runtime.ts)  
- Preview: test Stripe only  
- Production: live Stripe only (`STRIPE_ALLOW_LIVE=true` + `sk_live_` / `pk_live_`)

## 1. Migrations

```powershell
# From repo root — uses temp config if needed
npx wrangler d1 migrations apply SHOP_DB --remote --config wrangler.jsonc
```

Expect `0001`–`0006` applied on `nomad403-prod`.

## 2. Production Worker secrets

Set on the **production** Worker `my-website` (not Preview):

| Secret | Notes |
|--------|--------|
| `AUTH_SECRET` | ≥32 chars, distinct from Preview |
| `AUTH_MFA_KEY` | 32-byte base64, distinct from Preview |
| `ADMIN_EMAILS` | Same operator email as Access |
| `RESEND_API_KEY` / `RESEND_FROM` | Verified domain |
| `CF_ACCESS_TEAM_DOMAIN` | e.g. `glennrichard-dev.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | AUD of Access app for `www.nomad403.com` |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from live endpoint |
| `STRIPE_ALLOW_LIVE` | exactly `true` |
| `STRIPE_PRICE_ESSENTIAL_MONTHLY` | live `price_…` |
| `STRIPE_PRICE_ESSENTIAL_YEARLY` | |
| `STRIPE_PRICE_PLUS_MONTHLY` | |
| `STRIPE_PRICE_PLUS_YEARLY` | |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | |
| `STRIPE_PRICE_PREMIUM_YEARLY` | |
| `STRIPE_PRICE_FRIEND_HOST_MONTHLY` | |
| `STRIPE_PRICE_FRIEND_CARE_MONTHLY` | |

Plain vars (already in [`wrangler.jsonc`](../wrangler.jsonc)): `NOMAD403_ENV=production`, `SHOP_ENABLED=1`, `SHOP_DB_ID`, `APP_URL=https://www.nomad403.com`.

## 3. Stripe live webhook

Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://www.nomad403.com/api/stripe/webhook`
- Events: subscription / invoice / payment_intent / charge.refunded (same set as Preview)
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## 4. Cloudflare Access

Confirm Zero Trust app covers:

- `www.nomad403.com/admin`
- `www.nomad403.com/api/admin`

Policy allow + MFA; email ∈ `ADMIN_EMAILS`.

## 5. Deploy

Do **not** use `npm run publish:preview` for production.

1. Merge shop branch to the production deploy branch (`main` / Cloudflare Builds).
2. Deploy Worker with updated `wrangler.jsonc` bindings (`SHOP_DB`, `AUTH_LIMITER`).
3. Confirm secrets are attached to the **production** environment.

## 6. Pre-deploy readiness probe

```powershell
node scripts/prod-shop-readiness.mjs
```

Reports whether production Worker already has D1 `nomad403-prod`, `AUTH_LIMITER`, vars, and secret **names** (no values). Exit 2 until ready.

As of the shop readiness work: D1 migrated empty; production Worker still missing shop vars/D1 binding/most Stripe secrets. `https://www.nomad403.com/shop` may 404 until this branch is deployed to production.

**Do not deploy** until `AUTH_SECRET`, Stripe live prices, webhook, and `STRIPE_ALLOW_LIVE=true` are set.

## 7. Smoke after deploy

1. `/shop` → create account → Resend confirmation → session.
2. Checkout small live amount (or Friend plan) → return URL.
3. Webhook delivers → subscription on Mon compte + admin.
4. `/admin` → Access then console loads.

## Preview payment (still incomplete)

See [SHOP-PREVIEW-STRIPE-STATUS.md](./SHOP-PREVIEW-STRIPE-STATUS.md). Finish Preview Price IDs before treating Preview checkout as GO.
