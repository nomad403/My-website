# D1 migration of Shop qualification

## Implemented

The Cloudflare qualification runtime now uses D1 for authentication, billing, private promotions, interventions and administrative/financial projections. It requires the explicit Preview marker, Shop enable flag and the dedicated qualification database ID. PostgreSQL adapters and original migrations remain as development-only reference/recovery tools and parity-test fixtures; they are not imported by the Worker runtime. postgres is a development dependency.

The four drizzle-d1 migrations contain the complete schema, immutable records, atomic guards, billing revision triggers and workspace indexes. Official Wrangler applies remote migrations and records d1_migrations; the local test migration helper has its own checksummed ledger. Do not mix their ledgers or migrate production. Existing PostgreSQL data has not been transferred. Unicode profile search keys must be normalized by the application during any future import.

Billing and intervention commands stage mutations in a single D1 atomic batch, guarded by a shared revision. Conflicts retry within a bounded budget. Receipt handling, promotion reservations, refund totals, audit events, time consumption and outbox writes retain their transactional contracts. Paid-invoice proof gates intervention entitlement. Annual subscriptions still have monthly quotas without carryover.

## Redis cleanup

Redis REST adapters, credentials and obsolete integration tests were removed from active code and environment examples. Cloudflare SQLite Durable Objects implement authentication and contact abuse limits with hashed keys, persistent state and concurrency tests. Production cannot fall back to an in-memory limiter. Historical audit reports retain their original observations and are superseded for current configuration by SHOP-PREVIEW-EXECUTION.md.

## Validation

189 tests pass (150 security/core, 39 D1). D1 tests compare PostgreSQL and D1 workspace/financial behavior, verify atomic quota allocation under contention and inject outbox failures to demonstrate rollback. No tests are ignored in the current suites; the old unconfigured Redis test was retired, not counted as passed. Tests used Node 22.23.5 because PGlite can fail with a native V8 assertion on the host Node 24.14.1. TypeScript and Next.js/OpenNext builds pass. Full npm audit reports zero vulnerabilities.

OpenNext requires @opennextjs/cloudflare 1.20.16 and Wrangler 4.160.1 pinned in the lockfile; the resolved Next.js patch is 15.5.29. The legacy PostgreSQL runtime dependency had to be removed to eliminate an OpenNext bundle resolution error. Production behavior is not qualified by this Preview branch.

The authorized empty remote D1 qualification database has migrations 0001-0004 applied. Authentication secrets are independent and remain outside Git. See SHOP-PREVIEW-EXECUTION.md for publication, provider prerequisites and limitations. No email, payment or production deployment is included in these results. External qualification remains NO-GO.
