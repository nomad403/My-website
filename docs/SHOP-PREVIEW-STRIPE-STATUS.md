# Preview Stripe status (phase 0)

Checked against remote Preview `qualification/shop-lot-7` on 2026-11-13.

## Present on Preview deployment

- `STRIPE_SECRET_KEY` (secret)
- `STRIPE_WEBHOOK_SECRET` (secret)
- `RESEND_API_KEY` (secret)
- Auth / D1 / shop flags (`SHOP_ENABLED=1`, `NOMAD403_ENV=preview`)

## Missing for end-to-end test checkout

- `STRIPE_PUBLISHABLE_KEY`
- `RESEND_FROM`
- All eight `STRIPE_PRICE_*` IDs

Until those Preview secrets are set, checkout returns unconfigured / incomplete Stripe env. Auth + email confirmation still require `RESEND_FROM`.

## Smoke already verified

- `GET /shop` → 200
- `POST /api/account/checkout` without session → `auth_required` (middleware OK)

## Next for Preview payment GO

```text
npx wrangler preview secret put STRIPE_PUBLISHABLE_KEY --name qualification/shop-lot-7 --worker-name my-website
npx wrangler preview secret put RESEND_FROM --name qualification/shop-lot-7 --worker-name my-website
npx wrangler preview secret put STRIPE_PRICE_ESSENTIAL_MONTHLY --name qualification/shop-lot-7 --worker-name my-website
# … repeat for the seven other STRIPE_PRICE_* keys
```

Then: sign up → confirm email → pay with `4242…` → confirm webhook → subscription in account/admin.
