# Shop: Cloudflare qualification Preview

Branch: qualification/shop-lot-7. Existing Worker: my-website. Production branch main is not changed or deployed by this procedure.

## Authorized resources

Owner approved creation and migration of D1 nomad403-shop-qualification (2eb5526a-1d0c-469c-ae36-debe83ec8218, WEUR), Preview-only bindings, isolated rate limiters and independent authentication secrets. Migrations 0001 through 0004 were applied and their remote history verified on 2026-11-12. No production database or customer records were imported.

Preview R2: nomad403-preview-opennext-cache, separate from production. Cache prefix includes branch hash and build ID. ContactLimiter and AuthLimiter use native Preview Durable Object namespaces. Self-reference uses ctx.exports.PreviewSelfReference, without an external service binding to production. Images and Assets follow the native Preview configuration.

## Publication

1. npm ci; run tests, TypeScript, build:cloudflare and audit:preview.
2. Only qualification/shop-lot-7 may be published by scripts/publish-preview.mjs. Remote checks verify empty Preview Base configuration, the dedicated database and bucket, and any existing Preview deployment bindings before writes.
3. npm run publish:preview initializes the isolated R2 cache and publishes a native Preview using --ignore-base-config. npm run publish is the same guarded alias for the existing Cloudflare Builds command. No production deploy script is provided.
4. Push only qualification/shop-lot-7. Expected alias: https://qualification-shop-lot-7-my-website.glennrichard-dev.workers.dev ; verify actual deployment metadata and commit tag before declaring success.

Initial authentication secrets and the owner's authorized administrator/recipient address are stored only in an ignored .wrangler file. The first successful local publication uploads them exclusively to this Preview and renames the file to qualification-secrets.applied.json. Never print, commit or transfer this file. Later native Preview deployments inherit this branch's secret bindings.

## Owner configuration: Preview only

Use native branch secrets, never the production secret command:

    npx wrangler preview secret put RESEND_API_KEY --name qualification/shop-lot-7 --worker-name my-website
    npx wrangler preview secret put RESEND_FROM --name qualification/shop-lot-7 --worker-name my-website

Use a verified qualification sender. ADMIN_EMAILS, QUALIFICATION_EMAILS and RESEND_TO are private Preview secrets initialized with the owner-authorized address. No email is sent by this preparation. Missing mail configuration prevents magic-link qualification; it does not bypass authentication.

### Admin: Cloudflare Zero Trust (Access)

Application TOTP MFA for `/admin` is disabled. Protect the Preview hostname with a Cloudflare Access application:

1. Zero Trust → Access → Applications → Add an application (Self-hosted).
2. Application domain: the Preview worker hostname (for example `qualification-shop-lot-7-my-website.glennrichard-dev.workers.dev`).
3. Path policies covering at least `/admin` and `/api/admin` (and subpaths).
4. Allow policy: your operator identity (email / IdP group).
5. After Access, open `/admin` and complete the ADMIN_EMAILS magic-link if no Nomad403 session exists.

Without Access configured on the hostname, `/admin` relies only on magic-link + `ADMIN_EMAILS`. Configure Access before treating Preview admin as edge-hardened.

Stripe remains optional and disabled until test-only STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET and the eight Price IDs from lib/billing/stripe-env.ts are set on this Preview. Use the same preview secret put command for each. Never put application credentials in build variables. No payments or Stripe resources were created.

## Evidence and limits

Local security/core suites: 150 passed. D1 suites: 39 passed, including PostgreSQL/D1 workspace and finance parity, concurrent quota allocation and rollback. The obsolete external Redis test was removed with that implementation; replacement Durable Object tests execute locally. TypeScript passed; Next.js/OpenNext built successfully. npm audit including development dependencies: zero vulnerabilities.

Compiled Worker local smoke: /, /shop, /projects, /specialist return 200; /admin redirects to authentication; /api/account rejects anonymous access. The local authentication endpoint rejects a mismatched origin. No provider email or payment was invoked.

GO local preparation only. External Resend/Stripe qualification remains NO-GO until configured and actually exercised. Remote Preview availability and Git SHA must be checked after publication. Strix scanning is not claimed as executed here. D1 migration success is not a functional payment qualification.
