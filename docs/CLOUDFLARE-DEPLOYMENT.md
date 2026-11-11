# Cloudflare Workers ? audit et livraison locale

Date : 2026-11-11. Aucun push, deploiement, changement DNS ou Vercel effectue.

## Source et perimetre

Depot confirme par le proprietaire : https://github.com/nomad403/My-website.git.
Branche locale dediee : `fix/cloudflare-worker-self-reference`.
Worktree : `../My-website-cloudflare`.
Base exacte : main `26e5de2aac1a20be225411d18a86b3a05897f883`, egalement verifiee sur GitHub.
Le journal fourni ne contient pas la branche ni le SHA construits par Cloudflare : ces deux champs restent a relever dans ses parametres Git/details du build. La similitude des routes avec main est un indice, pas une preuve du SHA.

Les branches et le worktree de recuperation restent preserves. Comparaison a main : Lots 1?3, 82 fichiers / 9115 insertions / 62 suppressions ; Lot 6, 124 fichiers / 12390 insertions / 62 suppressions. Aucun de ces lots n'est fusionne. La base portfolio ne contient pas /shop ; son absence du build n'est donc pas une perte de route imputable a OpenNext. Les 143 tests Shop ne s'appliquent pas a cette branche.

## Cause confirmee

Le journal du 11 novembre, 20:50?20:53 UTC, montre un premier build Next 15.5.28 reussi, puis `npx wrangler deploy` sans configuration versionnee. Wrangler 4.160.1 a lance automatiquement la migration OpenNext 1.20.16 :
- installation avec --force, modification des dependances et passage a Next 15.5.29 ;
- creation de wrangler.jsonc, open-next.config.ts, .dev.vars et public/_headers ;
- modification des scripts, de .gitignore et de la configuration Next ;
- second build Next puis creation du bundle.

La cible etait my-website, mais le binding WORKER_SELF_REFERENCE visait my-v0-project, inexistant : erreur API 10143 confirmee. Le nom du package my-v0-project a ete repris dans la configuration generee. Le journal confirme les fichiers modifies automatiquement, pas leur contenu integral.

Attention : avant cet echec, cette ancienne tentative avait deja peuple six entrees R2 et televerse des assets. Un echec de publication de version ne signifie pas absence de ces effets distants. Aucune operation distante de ce type n'a ete relancee ici.

## Correction versionnee

`wrangler.jsonc` fixe explicitement :
- name = my-website ; services[WORKER_SELF_REFERENCE].service = my-website ;
- main = .open-next/worker.js ; ASSETS = .open-next/assets ;
- NEXT_INC_CACHE_R2_BUCKET = my-v0-project-opennext-cache, nom observe dans le journal, conserve sans creation ni renommage ;
- binding IMAGES conserve ; nodejs_compat et global_fetch_strictly_public ;
- compatibility_date = 2026-11-10 ; routes = [] ; aucune configuration de build implicite.

Le cache R2 est choisi explicitement dans open-next.config.ts. Aucun secret ni .dev.vars n'est ajoute. Le script check-cloudflare verifie la coherence des cibles, bindings, outils et artefacts avant build/preview/deploy. Une configuration valide evite l'automigration.

Dependances necessaires : OpenNext 1.20.16 et Wrangler 4.160.1, versions exactes verrouillees. Le peer OpenNext impose Next >=15.5.29 : seul le correctif 15.5.28 -> 15.5.29 est retenu. L'installation introduisait des alertes glob/minimatch ; les overrides cibles glob 14.0.5 / minimatch 11.0.8 donnent un audit final sans alerte et les builds/tests passent. Le lock inclut aussi les deduplications npm hasown/yaml. Pas de --force, --legacy-peer-deps ni contournement des protections d'installation utilise pour cette livraison.
Node local epingle via .node-version : 24.14.1 ; journal distant : 24.22.1. Verifier que le runner futur respecte la version choisie.

Deux adaptations de runtime indispensables ont ete verifiees :
- Contact : l'identite cliente Vercel reste inchangee ; sous Workers, le contexte OpenNext et un binding Worker valide sont requis avant de faire confiance a CF-Connecting-IP. Aucun simple header ne suffit. Redis reste obligatoire et les echecs restent fermes (503).
- /signature : la lecture disque public echouait reellement dans workerd (404). La route utilise maintenant ASSETS dans Workers, avec lecture disque conservee sous Node. PNG identique octet pour octet dans les deux runtimes.

public/_headers applique aux assets les protections deja presentes dans Next et le cache immutable des chunks. Next est ancre a la racine du worktree pour le tracing et Turbopack. Aucun changement de composants, styles, tarifs ou medias portfolio.

## Fichiers livres

Modifies : .gitignore, app/signature/route.ts, lib/contact/contact-abuse.ts, next.config.js, package.json, package-lock.json, tests/contact-security.test.mjs.
Ajoutes : .node-version, lib/contact/trusted-client.ts, open-next.config.ts, public/_headers, scripts/check-cloudflare.mjs, wrangler.jsonc, docs/CLOUDFLARE-DEPLOYMENT.md.
Total : 14 fichiers. Les sitemaps regeneres sont remis a leur contenu initial ; seuls leurs horodatages avaient change.
Caches, dependances, .dev.vars*, .open-next, .wrangler et .cloudflare-review sont exclus. Aucun secret distant configure.

## Verifications executees

| Controle | Resultat |
| --- | --- |
| npm ci | Reussi, 421 packages installes, 422 audites |
| npm audit final | 0 vulnerabilite connue |
| Tests securite contact | 21 tests : 20 reussis, 1 ignore, 0 echec |
| Test ignore | Redis TCP externe, REDIS_TEST_PORT absent ; non revendique comme reussi |
| TypeScript | Reussi |
| Build Next | Reussi, Next 15.5.29 |
| Build OpenNext | Reussi, adaptateur 1.20.16 / AWS 4.1.15 |
| Preview workerd locale | Reussie, bindings ASSETS/Images/R2/self locaux |
| HTTP | 22 controles routes/assets/API, 26 fichiers publics compares aux assets copies |
| /signature | HTTP 200 et PNG identique sous Node et Workers |
| Carte / QR / vCard | Audit navigateur reussi aux largeurs 320, 375, 390, 430, 768 |
| Experience | 9 scenarios consentement/capteurs/navigation/cache + mode capture reussis |
| Comparaison navigateur Node/Workers | 2 runtimes, 12 pages, 8 captures, WebGL actif, 0 erreur |
| Git et secrets | Diff --check reussi ; 14 chemins indexes controles, aucune detection de secret |

Les audits carte/experience ont ete executes depuis des copies temporaires ignorees : chemins /tmp adaptes a Windows ; deux selecteurs obsoletes adaptes aux libelles existants (Continuer sans..., sensor/sensors). Aucun changement produit pour satisfaire les assertions.
Captures inspectees et preuves locales dans .cloudflare-review, non commitees. Les requetes navigateur hors localhost sont limitees aux lectures CDN publiques jsDelivr necessaires au WebGL existant. Aucun appel API de production ni envoi de mail.

## Limites et risques residuels

- Publication API Cloudflare non executee : la coherence de configuration qui causait 10143 est corrigee et verifiee localement ; le succes d'une publication distante n'est pas revendique.
- Branche/SHA du build Cloudflare encore non attestes ; les verifier avant publication.
- Existence/droits du bucket distant et disponibilite Images dans le compte non verifies a distance. La preview utilise leurs equivalents locaux.
- Contact reel Resend/Redis non qualifie faute de configuration ; les cas d'erreur et refus sont verifies. Fournir les secrets via Cloudflare apres autorisation, jamais dans Git.
- Workers Static Assets ne gere pas Range : reponse 200 avec fichier complet, pas 206. Les deux MP3 (16 641 462 et 9 025 410 octets) restent identiques et sous la limite de taille ; le lecteur actuel charge le buffer complet. Pas de video native/MP4/WebM dans cette base. Un futur besoin de seek/video demanderait une autre strategie de diffusion.
- WebGL depend toujours des modules publics jsDelivr ; aucune suppression de cette dependance existante.
- OpenNext avertit du support Windows incomplet : builds et preview ont reussi ici ; reproduire npm ci et build sur Linux/WSL avant publication.
- routes: [] ne configure aucun domaine de production. Avant tout futur deploy, verifier les routes deja attachees au Worker : appliquer cette configuration peut changer les associations distantes. Ne pas publier sur le Worker de production sans revue de ce point.

## Procedure de publication future ? autorisation separee requise

1. Relever dans Cloudflare la source Git, branche et SHA, la version Worker active, routes/domaines existants, bindings et droits. Confirmer le compte et my-website. Conserver cette preuve pour retour arriere.
2. Apres validation du proprietaire seulement, publier la branche souhaitee sur GitHub et configurer la source de build Cloudflare. Ne pas pointer sur main sans revue ; ne pas lancer de migration automatique.
3. Installation reproductible : `npm ci`.
4. Validation : `node --test tests/contact-security.test.mjs`, `npx --no-install tsc --noEmit`, `npm audit`.
5. Commande Build Cloudflare : `npm run build:cloudflare`. Cette commande lance Next une seule fois via OpenNext, puis produit .open-next.
6. Preview locale : `npm run preview:cloudflare`. Ne pas utiliser de bindings remote pour cet essai.
7. Commande Deploy apres autorisation uniquement : `npm run deploy:cloudflare`. Elle utilise l'artefact existant, ne lance pas migrate et ne reconstruit pas Next. Ne pas utiliser `npx wrangler deploy` sans configuration.
8. OpenNext deploy peut peupler le cache R2 distant et utiliser un Worker auxiliaire de population : ce sont des mutations distantes a autoriser, meme si la publication finale echoue. Aucun bucket ne doit etre cree automatiquement sans revue.
9. Tester le Worker sur une URL autorisee, routes/API/signature/assets et contact de test avant toute decision DNS. Ne changer ni DNS ni Vercel dans cette livraison.

## Retour arriere

Avant publication, noter l'identifiant de la derniere version Workers saine et exporter la configuration non sensible. En cas de regression apres une publication autorisee, le proprietaire pourra restaurer cette version via Cloudflare, avec les bindings/routes compatibles. Aucun identifiant de version saine n'est actuellement connu : ne pas en inventer.
Ne pas supprimer le bucket ni vider les caches comme retour arriere automatique ; les assets/R2 televerses ne sont pas annules par le rollback de version. Les DNS et Vercel etant inchanges ici, aucune action sur eux n'est necessaire.
Localement, main et les branches Lots 1?6 restent intactes ; conserver ou abandonner la branche de correction suffit, sans reset/clean des travaux existants.

## References

- [OpenNext configuration](https://opennext.js.org/cloudflare/get-started)
- [OpenNext CLI : build, preview, deploy, migrate](https://opennext.js.org/cloudflare/cli)
- [Configuration automatique Wrangler](https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/)
- [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [Assets : limites et absence de Range](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Headers des assets](https://developers.cloudflare.com/workers/static-assets/headers/)

Conclusion : GO pour la revue de cette correction locale et la preparation d'une publication controlee ; NO-GO pour affirmer une validation distante ou un deploiement de production reussi.

Controle de preservation : 470 empreintes SHA256 du projet original et de la sauvegarde verifiees, 0 difference. Working tree limite aux 14 fichiers prevus avant commit ; aucun fichier sensible indexe.
