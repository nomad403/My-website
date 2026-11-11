# Nomad403 — diagnostic et procédure de récupération Git
Date : 11 novembre 2026. Rapport préalable à toute opération de rattachement.

## Sauvegarde effectuée avant les recherches
Dossier source : `C:/Users/Glenn/Desktop/Nomad403 projects/My-website`.

Sauvegarde distincte : `C:/Users/Glenn/Desktop/Nomad403 projects/Nomad403-backup-2026-11-11-f24d149a`.

235 fichiers, 28 334 558 octets. Chaque fichier copié a été vérifié par SHA-256. Manifeste local : même chemin suivi de `.manifest.json`. Les fichiers cachés, configurations, exemples d'environnement, tmp et captures ont été préservés. Aucune règle d'exclusion des fichiers secrets. Seuls les dossiers node_modules et .next et les fichiers *.tsbuildinfo (caches TypeScript) ont été exclus. Aucun contenu secret n'a été affiché ou transmis. Les droits de destination sont hérités du dossier voisin ; cette sauvegarde n'est pas une archive chiffrée.

Une nouvelle lecture de tous les fichiers inventoriés après les recherches confirme que leurs SHA-256 sont inchangés. Les seuls nouveaux fichiers de cette mission sont les données/scripts de diagnostic dans tmp et ce rapport ; ils sont postérieurs à la sauvegarde et exclus des chiffres de comparaison ci-dessous.

## Identité distante confirmée
- Référence locale explicite : [docs/STRIX.md](./STRIX.md), ligne 57, lien vers le workflow du dépôt.
- Dépôt : [nomad403/My-website](https://github.com/nomad403/My-website).
- URL Git HTTPS : `https://github.com/nomad403/My-website.git`.
- Identifiant GitHub : 1017906649. Dépôt public, non archivé.
- Branche principale confirmée par l'API : `main`.
- Révision comparée : [26e5de2aac1a20be225411d18a86b3a05897f883](https://github.com/nomad403/My-website/commit/26e5de2aac1a20be225411d18a86b3a05897f883), du 3 novembre 2026 à 18:42:33, heure de Paris.
- Connecteur GitHub authentifié sous `nomad403`, lecture du dépôt, des branches, des commits, de l'arbre et des fichiers réussie. Les droits retournés incluent pull/push/admin ; aucune opération d'écriture distante effectuée.
- GitHub CLI : `gh` non trouvé par Get-Command et where.exe, ni aux deux chemins d'installation usuels testés (Program Files et AppData/Local/Programs). Aucun hosts.yml trouvé aux trois emplacements usuels vérifiés. Connexion CLI non vérifiable, pas présumée active. L'accès du connecteur ne prouve pas l'authentification de Git en ligne de commande. Aucun jeton lu ni affiché.

Les autres références GitHub locales identifiées concernent des dépendances ou outils (Stripe, Neon, QRCode, Strix). L'identification du dépôt est corroborée par 140 fichiers strictement identiques ; ce n'est pas une supposition fondée sur le nom du dossier.

## Historique consulté
Dix commits récents de main ont été examinés via l'API, avec leur chaîne de parents. Aucun historique local n'a été recréé. Ce contrôle n'est pas un audit exhaustif de tous les commits.

- `26e5de2aac1a` — 2026-11-03 — Override sucrase to clear moderate npm audit findings.
- `5182508859e0` — 2026-11-03 — Add Ismaël Bah portfolio and tighten the entry gate copy.
- `89eef5f38f35` — 2026-10-26 — Protect contact form and patch vulnerable dependencies (#2)
- `835ea9fbb7fa` — 2026-10-25 — Add automated Strix security audits with GitHub Actions
- `cabaad4addb3` — 2026-10-14 — Add NFC business card with vCard, local QR and sharing

Branches distantes retournées : main, security/contact-abuse-and-dependencies, vercel/react-server-components-cve-vu-nhqiu5.

Le dépôt parent `C:/Users/Glenn/.git` n'est pas utilisé comme dépôt du projet. Le diagnostic précédent y a trouvé une branche sans commit, aucun distant et aucun fichier du projet suivi ; rien n'a été modifié dans ces métadonnées pendant cette mission.

## Comparaison du dossier sauvegardé avec main
Comparaison indépendante d'un checkout : arbre GitHub récursif complet (non tronqué), 149 blobs, aucun sous-module ou lien symbolique spécial. Pour chaque fichier commun, calcul local du SHA-1 de blob Git (en-tête et contenu), comparé au SHA distant. Un contrôle CRLF vers LF a aussi été effectué ; aucun écart ne se limite aux fins de ligne. Les données locales et leurs contenus n'ont pas été envoyés à GitHub.

| Catégorie | Nombre |
| --- | ---: |
| Fichiers suivis distants | 149 |
| Strictement identiques | 140 |
| Modifiés localement | 9 |
| Absents localement parmi les fichiers distants | 0 |
| Présents uniquement localement | 86 |
| Dont sources, tests, documents et configuration | 72 |
| Dont tmp et next-env.d.ts | 14 |

Il s'agit d'une comparaison avec le snapshot distant identifié, pas d'un git status ni d'une preuve de descendance locale. Sans les métadonnées Git originales, on ne peut pas reconstituer l'ordre des commits locaux des Lots 1, 2 et 3. Leur état de fichiers actuel est préservé.

### Fichiers modifiés
- `.gitignore`
- `components/chrome/ClientLayout.tsx`
- `components/chrome/SiteChromeNav.tsx`
- `contexts/LanguageContext.tsx`
- `next-sitemap.config.js`
- `next.config.js`
- `package-lock.json`
- `package.json`
- `public/sitemap-0.xml`

Les contenus distants de sept fichiers modifiés ont aussi été consultés : ajout de l'exception .env.auth.example à .gitignore ; intégration des routes compte/shop au layout et à la navigation ; textes FR/EN ; exclusion des routes privées du sitemap et ajout de /shop ; racines Next.js et en-têtes de protection ; scripts de migrations/tests et dépendances Drizzle/Postgres/Stripe/PGlite. Le lockfile et le sitemap généré sont confirmés différents par hash, sans revue exhaustive ligne à ligne dans cette mission.

### Fichiers ajoutés candidats au versionnement
Ces 72 fichiers ne sont pas dans le snapshot distant ; cette liste reste à examiner avant staging. Elle ne constitue pas une autorisation de publier.
- `.env.auth.example`
- `app/admin/page.tsx`
- `app/api/account/checkout/route.ts`
- `app/api/account/invoices/route.ts`
- `app/api/account/portal/route.ts`
- `app/api/account/projects/route.ts`
- `app/api/account/promotion/route.ts`
- `app/api/account/subscriptions/route.ts`
- `app/api/admin/summary/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/magic-link/route.ts`
- `app/api/auth/mfa/enroll/route.ts`
- `app/api/auth/mfa/verify/route.ts`
- `app/api/auth/session/route.ts`
- `app/api/auth/verify/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/auth/mfa/page.tsx`
- `app/auth/verify/page.tsx`
- `app/shop/page.tsx`
- `components/auth/AdminBillingLists.tsx`
- `components/auth/AdminSummary.tsx`
- `components/auth/AuthFrame.tsx`
- `components/auth/MfaForm.tsx`
- `components/auth/VerifyForm.tsx`
- `components/shop/ShopAuthPanel.tsx`
- `components/shop/ShopExperience.tsx`
- `docs/LOT3-CORRECTIONS-2026-11-11.md`
- `docs/LOT3-QUALIFICATION-2026-11-11.md`
- `docs/SHOP-STRIPE.md`
- `drizzle/0001_foundations.sql`
- `drizzle/0002_stripe.sql`
- `lib/auth/cookie.ts`
- `lib/auth/crypto.ts`
- `lib/auth/email.ts`
- `lib/auth/http.ts`
- `lib/auth/memory-store.ts`
- `lib/auth/rate-limit.ts`
- `lib/auth/route.ts`
- `lib/auth/runtime.ts`
- `lib/auth/service.ts`
- `lib/auth/store.ts`
- `lib/auth/totp.ts`
- `lib/billing/account-http.ts`
- `lib/billing/apply-event.ts`
- `lib/billing/checkout.ts`
- `lib/billing/event-order.ts`
- `lib/billing/gateway.ts`
- `lib/billing/memory-store.ts`
- `lib/billing/metrics.ts`
- `lib/billing/notices.ts`
- `lib/billing/promotion.ts`
- `lib/billing/store.ts`
- `lib/billing/stripe-env.ts`
- `lib/billing/stripe-gateway.ts`
- `lib/billing/stripe-map.ts`
- `lib/chrome/nav-items.ts`
- `lib/db/auth-store.ts`
- `lib/db/billing-store.ts`
- `lib/db/client.ts`
- `lib/db/schema.ts`
- `lib/db/statements.ts`
- `lib/shop/catalog.ts`
- `lib/shop/plans.ts`
- `middleware.ts`
- `scripts/create-promotion-code.mjs`
- `scripts/db-migrate.mjs`
- `tests/auth-schema.test.mjs`
- `tests/auth-security.test.mjs`
- `tests/billing-stripe.test.mjs`
- `tests/register-ts.mjs`
- `tests/shop-catalog.test.mjs`
- `tests/ts-loader.mjs`

### Artefacts locaux à préserver hors commit par défaut
- `next-env.d.ts`
- `tmp/lot3-before.json`
- `tmp/lot3-red-check.cjs`
- `tmp/shop-review/01-portfolio-desktop.png`
- `tmp/shop-review/02-shop-offers-desktop.png`
- `tmp/shop-review/03-shop-yearly-desktop.png`
- `tmp/shop-review/04-shop-subscribe-desktop.png`
- `tmp/shop-review/05-shop-account-desktop.png`
- `tmp/shop-review/06-expertise-desktop.png`
- `tmp/shop-review/07-shop-english-desktop.png`
- `tmp/shop-review/08-shop-mobile.png`
- `tmp/shop-review/09-shop-mobile-menu.png`
- `tmp/shop-review/09b-menu-settled.png`
- `tmp/shop-review/10-portfolio-mobile.png`

Aucune suppression détectée par rapport au snapshot distant. Aucun renommage n'a besoin d'être inféré pour expliquer cet inventaire.

## Procédure recommandée — non exécutée, soumise à validation
1. Garder le dossier actuel et la sauvegarde intacts. Choisir un nouveau dossier voisin qui n'existe pas encore, par exemple `My-website-recovery`.
2. Après validation de cette procédure, cloner le dépôt GitHub complet dans ce nouveau dossier, sans shallow clone. Vérifier origin, main, le SHA courant et la présence de l'historique. Vérifier séparément l'accès Git HTTPS, car seul le connecteur est confirmé aujourd'hui.
3. Créer dans le clone une branche locale dédiée, par exemple `recovery/lots-1-3`, depuis la révision comparée. Si main a avancé, faire une nouvelle comparaison avant de reporter quoi que ce soit.
4. Copier dans le clone les 72 ajouts candidats et les 9 fichiers modifiés, uniquement après validation explicite de ce report. Aucun écrasement dans le dossier original. Conserver également toutes les configurations locales nécessaires comme fichiers locaux non suivis ; ne pas copier les métadonnées du dépôt parent. Préserver les artefacts dans la sauvegarde ou séparément.
5. Vérifier les empreintes des fichiers reportés contre la sauvegarde, puis examiner git status et git diff dans le clone. Aucune suppression n'est prévue dans l'état observé. Contrôler les règles ignore et les secrets localement avant staging ; ne jamais utiliser un ajout global non examiné. next-env.d.ts, caches, dépendances et tmp restent hors commit par défaut.
6. Réinstaller les dépendances dans le clone et relancer la suite de tests, TypeScript puis le build de façon séquentielle. Ces commandes n'ont pas été relancées durant ce diagnostic, qui n'a pas changé le code.
7. Après revue du contenu exact, créer un commit local de récupération descendant de l'historique GitHub. Il préservera le snapshot des Lots 1–3, sans inventer des commits historiques par lot. Vérifier ensuite que le clone possède son propre .git, une branche et un distant cohérents.
8. Ne faire aucun push ou publication à ce stade : le dépôt peut avoir des intégrations de déploiement. Toute publication doit faire l'objet d'une instruction distincte compatible avec l'interdiction de déployer.

Cette méthode conserve trois copies distinctes (original, sauvegarde vérifiée, clone de récupération) et préserve l'historique distant. Aucun git init, reset, clean, push --force, remplacement de fichier applicatif, clone, commit ou changement de configuration Git n'a été réalisé. Aucun déploiement, ressource externe créée, paiement ou travail sur le Lot 4.
