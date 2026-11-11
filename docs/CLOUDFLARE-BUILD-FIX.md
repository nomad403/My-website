# Correction du build Workers CI ? 11 novembre 2026

## Cause confirmee dans le journal fourni

Le build de 21:52 UTC executait `npm run build` = `next build`, puis `npx wrangler deploy`. Next reussissait, mais la configuration compilee OpenNext n'etait jamais creee. Le deploy OpenNext echouait donc avec : "Could not find compiled Open Next config, did you run the build command?". Ce nouvel echec precede toute verification API du self binding ; ce n'est pas une recurrence demontree de 10143.

## Correction

- `npm run build` passe par scripts/build.mjs.
- Dans Workers Builds (`WORKERS_CI=1`), il lance `npm run build:cloudflare`, qui cree Next et le bundle OpenNext.
- Hors Workers Builds, il lance `npm run build:next` et conserve le build Next ordinaire.
- OpenNext configure explicitement `buildCommand: "npm run build:next"` : il ne rappelle jamais le dispatcher et evite ainsi une recursion quand WORKERS_CI est herite.
- Le sitemap est genere par `postbuild:next`, avant la copie des assets OpenNext, une seule fois.
- Les controles locaux verifient les nouveaux scripts. Aucune dependance, aucun binding ni aucun fichier applicatif n'est modifie.

La detection repose sur la variable officielle [WORKERS_CI fournie par Cloudflare](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#environment-variables). Le champ buildCommand est declare et utilise par la version installee @opennextjs/aws 4.1.15.

## Commandes distantes

Les commandes actuelles du dashboard `npm run build` puis `npx wrangler deploy` disposent ainsi de l'artefact OpenNext requis. Il reste preferable d'utiliser les commandes explicites documentees : `npm run build:cloudflare` puis `npm run deploy:cloudflare`.
Ne pas remplacer la commande de publication Preview par un deploy actif. La preparation Preview reste NO-GO selon CLOUDFLARE-PREVIEWS.md : cette correction concerne la generation du bundle, pas l'isolation ou la validation distante des Previews.

## Verification

La commande distante est reproduite localement avec WORKERS_CI=1, apres archivage des anciens artefacts OpenNext dans le dossier temporaire ignore .cloudflare-review : le succes doit donc produire une nouvelle configuration compilee, pas reutiliser celle d'un essai precedent. Les preuves de controle et resultats finaux sont indiques ci-dessous.

Aucun deploiement Cloudflare manuel ni modification de dashboard effectue. Le push sur main est demande explicitement par le proprietaire et pourra declencher son automatisation de production. Aucun changement DNS, Vercel ou Lots Shop.

Resultats executes : TypeScript reussi ; securite 20 tests reussis, 1 Redis externe ignore, 0 echec ; npm run build avec WORKERS_CI=1 reussi, un build Next et un sitemap, nouvelle configuration compilee OpenNext lisible par retrieveCompiledConfig ; npm run build sans WORKERS_CI reussi, un build Next et un sitemap, aucune invocation OpenNext. Logs locaux ignores : .cloudflare-review/build-dispatch-ci.log, build-dispatch-next.log, build-dispatch-security.log et build-dispatch-tsc.log.

Aucune dependance ni aucun champ de binding modifie. Le succes de la prochaine publication distante reste a confirmer dans Cloudflare ; cette correction ne revendique pas une validation fonctionnelle des Previews.
