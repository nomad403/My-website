# Lot 3 — remise en état du 11 novembre 2026

Ce rapport actualise le diagnostic de `LOT3-QUALIFICATION-2026-11-11.md`. Deux anomalies corrigées et vérifiées localement : racine Next.js et réconciliation Stripe. Git reste bloqué faute de dépôt d'origine identifié. La qualification externe reste NON EXÉCUTÉE. Aucun service configuré ou créé, aucun déploiement, aucun paiement et aucun travail sur le Lot 4.

## Git : constat confirmé, aucune intervention

- Répertoire courant et racine applicative : `C:/Users/Glenn/Desktop/Nomad403 projects/My-website` (package.json, package-lock.json, app/, next.config.js).
- Aucun `.git` local ni dans les parents Desktop et Nomad403 projects. Aucun `.git` supplémentaire identifié dans la recherche locale de profondeur 3 hors dépendances et build.
- Git découvre `C:/Users/Glenn/.git`. La lecture hors bac à sable confirme `rev-parse --show-toplevel = C:/Users/Glenn`.
- Ce dépôt est sur une branche master sans commit, sans distant configuré et sans fichier suivi sous le chemin du projet. Il ne fournit donc aucun historique permettant de restaurer le checkout du projet.
- Dans le bac à sable, la traversée du profil parent échoue (`cannot change to`). Sans les exceptions safe.directory injectées dans le processus, Git signale aussi une différence de propriétaire : Glenn contre CodexSandboxOffline. Ce sont deux contrôles distincts. La lecture hors bac à sable fonctionne ; aucune protection n'a été désactivée.
- ACL observées : dossier projet appartenant à Glenn, profil parent à AUTORITE NT/Système, métadonnées Git à Glenn. Aucun changement de permissions ni de safe.directory.

État des changements antérieurs non certifiable : aucun historique du projet disponible dans ce dossier. Le diagnostic ne prouve pas l'absence d'un autre checkout ailleurs sur le disque ou d'un distant non configuré ici.

Solutions proposées avant toute intervention Git : retrouver le checkout d'origine ; ou fournir le distant correct et cloner dans un dossier séparé, puis reporter les fichiers en conservant les originaux pour comparaison. Aucun `git init`, déplacement, suppression de métadonnées ou changement d'historique exécuté. Le choix du dépôt d'origine reste nécessaire.

## Next.js : cause et correction vérifiées

Next installé : 15.5.28. Le build utilise webpack (`next build`) ; le développement utilise Turbopack (`next dev --turbo`). Aucun workspace explicite dans package.json et aucune racine explicite auparavant dans next.config.js. Deux lockfiles sont présents : celui du projet et celui du profil parent. L'avertissement initial confirmait le choix du parent, suivi de `EPERM readlink C:/Users/Glenn`.

Correction minimale : `outputFileTracingRoot: __dirname` et `turbopack: { root: __dirname }`. Options confirmées dans les types du Next installé et la documentation officielle : [traçage](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [racine Turbopack](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack). Aucun lockfile supprimé, aucune dépendance modifiée, aucun contrôle de sécurité désactivé.

Premier build après correction : compilation réussie puis erreur de manifeste (`no direct app page entry found for /admin`). Le manifeste ne contenait que deux entrées. Après vérification du chemin absolu et suppression du seul cache généré `.next`, le build complet a réussi, toutes les routes attendues étant présentes. Le cache précédent est la cause probable de cette erreur intermédiaire ; son mécanisme interne n'a pas été prouvé.

`npm.cmd run build` : code retour 0, compilation, validation des types, génération des 9 pages statiques, traçage et postbuild next-sitemap réussis. La sortie répertorie notamment `/`, `/specialist`, `/shop`, `/admin` et les API d'authentification et facturation. La configuration Turbopack est acceptée par Next ; le serveur de développement Turbopack n'a pas fait l'objet d'une qualification interactive.

## Stripe : correction vérifiée sur le store SQL local

Cause : `subscriptionWrite` ignorait un événement de même seconde lorsque son statut était identique. Les dates de résiliation pouvaient pourtant différer. De plus, une égalité sans fonction de réconciliation était considérée comme traitée.

Corrections :

- Les événements plus anciens restent ignorés ; les plus récents s'appliquent. Toute égalité d'horodatage exige désormais une relecture de Stripe, indépendamment du statut.
- Les deux implémentations du store appellent cette même politique.
- Une réconciliation absente, vide ou portant sur un autre abonnement renvoie `retry`. Une panne est propagée vers la route webhook, qui répond 500. L'événement ne devient traité qu'après succès, permettant son rejeu.
- Une suppression de même seconde exige aussi la réconciliation lorsque le statut local est déjà canceled. Une suppression avant création reste retryable. Le rejeu du même identifiant d'événement reste un doublon sans nouvel effet.
- La relecture conserve le montant, la formule, la période contractuelle et l'autorisation privée ; seuls statut et dates sont synchronisés.

Test ajouté dans `tests/auth-schema.test.mjs` avec `DrizzleBillingStore`, migrations SQL et PGlite. Il construit des événements `customer.subscription.updated` de même seconde et même statut avec dates différentes, relit un état Stripe simulé distinct du payload reçu, contrôle l'annulation puis le retrait de la résiliation, la panne/reprise, les réponses nulles ou de mauvais abonnement, les doublons, les événements anciens et les suppressions.

Preuve de non-régression : réintroduction temporaire de l'ancienne politique et de son appel dans le store SQL ; le test échoue (`applied` au lieu de `retry`). Restauration des fichiers corrigés puis même test : réussi. Aucun appel Stripe réel utilisé.

Limites : pas de qualification Neon ni Stripe réels, pas de test de concurrence réseau multi-webhooks. Cette correction ne crée pas un outil de réconciliation générale et ne garantit pas l'ordre d'écritures réellement simultanées ; ce risque reste à qualifier séparément.

## Vérifications finales

| Vérification | Résultat réellement obtenu |
| --- | --- |
| `npm.cmd run test:security` | 56 réussites, 0 échec, 1 ignoré |
| Contact/sécurité | 16 réussites, 1 Redis réel ignoré faute de REDIS_TEST_PORT |
| Authentification | 17 réussites, rôles, MFA, sessions, isolation inclus |
| Schéma et stores SQL PGlite | 3 réussites, dont le nouveau test Stripe |
| Catalogue/navigation shop | 4 réussites |
| Stripe avec doubles locaux | 16 réussites, prix serveur, codes privés, paiements/remboursements inclus |
| TypeScript isolé après build | `npx.cmd tsc --noEmit --incremental false` : code retour 0 |
| Production | `npm.cmd run build` : code retour 0 |
| Services externes | NON EXÉCUTÉ |

Une empreinte SHA-256 de 221 fichiers a été enregistrée avant les modifications. La comparaison confirme que les sources du portfolio, de l'Expertise, des pages shop, de navigation, des tarifs, des codes privés et de l'authentification n'ont pas changé. Les tests existants correspondants passent. Ce contrôle ne remplace pas une comparaison visuelle dans un navigateur, non exécutée.

Fichiers modifiés : `next.config.js`, `lib/billing/event-order.ts`, `lib/billing/apply-event.ts`, `lib/billing/memory-store.ts`, `lib/db/billing-store.ts`, `tests/auth-schema.test.mjs` et ce rapport. Le postbuild a aussi régénéré `public/sitemap-0.xml` (artefact signalé, aucune modification graphique). Fichiers locaux de diagnostic dans tmp : empreintes et script de reproduction de l'ancienne politique. Aucun fichier Git touché.

Décision : GO local pour les tests et le build ; correction Stripe vérifiée avec Stripe simulé et SQL local. NO-GO pour la traçabilité Git et la qualification fonctionnelle externe. Aucune réussite externe n'est déduite des tests locaux.
