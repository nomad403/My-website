# Lot 4 — gestion des promotions : qualification du 11 novembre 2026

Branche : `feature/shop-lot-4-promotions`, créée depuis `recovery/shop-lots-1-2-3` au commit `d113d986d2830af246d2ae97af998efc4be4c273`. Travail dans `My-website-recovery`. Aucun push, PR Lot 4, fusion, déploiement, paiement ni Lot 5.

## Inventaire de départ et choix retenus

| Élément existant | État constaté avant développement | Complément Lot 4 |
| --- | --- | --- |
| Codes privés | SHA-256, normalisation, offre, expiration, maximum, restriction e-mail, désactivation | Création admin, génération sûre, suffixe d'identification, conditions et notes |
| Réservations | Table promotion_redemptions et compteur réservé + consommé ; FOR UPDATE sur le code | Index unique partiel, historique atomique, tests de concurrence et de libération |
| Checkout | Prix serveur vérifié chez Stripe ; réutilisation locale pendant 30 minutes | Contrôle du statut distant après cette durée et nouvelle réservation après libération |
| Consommation | Événements Stripe réglés, expiration et échec asynchrones | Audit par déclencheur SQL, association explicite de la réservation à l'abonnement |
| Administration | /admin, MFA, indicateurs et listes de facturation | Une section Promotions dans ce même écran, sans seconde administration |
| Tarifs privés | Friend Host 10 EUR/mois, Friend Care 20 EUR/mois | Prix inchangés ; conditions Friend Care explicitent le maximum d'une heure/mois |
| Codes historiques | Créés par scripts/create-promotion-code.mjs | Compatibilité conservée et test de migration de données préexistantes |
| Interface | ProFont, Geist Mono, cadre AuthFrame, FR/EN | Formulaires, cartes, historique et pagination réutilisant ces styles |
| CI de référence | Security regression tests réussis sur d113d986d283 | Vérifications locales étendues, aucune nouvelle CI déclenchée |
| Strix | En cours au premier contrôle, puis échec avec un constat moyen | Constat analysé et corrigé localement, voir ci-dessous |

L'architecture et le guide d'exploitation sont détaillés dans [PROMOTIONS-ADMIN.md](./PROMOTIONS-ADMIN.md). Les prix sont issus du catalogue serveur ; aucun montant arbitraire accepté. Les conditions d'un code sont immuables en API et PostgreSQL, les notes sont modifiables, la désactivation est définitive et sans effet sur un abonnement existant.

La génération automatique utilise 12 octets cryptographiques (96 bits), au format NOMAD- suivi de 24 caractères hexadécimaux. L'unicité est assurée par la contrainte SQL sur le hash, avec trois essais maximum en mode automatique. Le texte complet ne persiste pas : il est révélé une seule fois à l'administrateur. Les anciens codes ne sont jamais prétendus récupérables.

## Problèmes trouvés et traitement

| Problème | Cause | Gravité | Correction et preuve |
| --- | --- | --- | --- |
| Énumération des promotions | Motifs publics différents et aperçu sans quota | Moyenne, confirmée par Strix | Code HTTP métier uniforme invalid, même statut/message ; quotas utilisateur/client avant lecture ; tests des cinq refus et de l'indisponibilité du limiteur |
| Réutilisation d'une réservation libérée | Rotation d'un Checkout ancien réutilisant le même identifiant après libération | Majeure pour l'intégrité des quotas | Nouvelle réservation sous verrou ; test de rotation d'un code illimité |
| Libération avant fin réelle de Checkout | Durée locale différente de la durée Stripe des anciennes sessions | Majeure pour l'intégrité des quotas | Lecture du statut Stripe : une session ouverte est conservée, une session terminée attend son webhook, une panne ne libère pas la réservation |
| Limiteur mémoire réinitialisé à chaque fabrique | Nouvelle instance en développement | Moyenne, limitée au développement | Instance partagée ; test de limite sur deux fabriques ; Redis reste obligatoire en production |
| Formulaire admin tronqué | Cadre document soumis aux styles overflow du portfolio | Majeure pour l'usage | Défilement propre à l'administration étendue ; captures et contrôle mobile |
| Risque de notes affichées périmées | Détail initialisé avec la copie de la liste | Mineure | Notes lues dans la réponse détaillée du serveur |

Le [rapport Strix de référence](https://github.com/nomad403/My-website/actions/runs/42962258650) ne signalait aucune vulnérabilité critique ou élevée. Son échec est réel : une vulnérabilité moyenne, CWE-203, CVSS 4.3. L'artefact a été inspecté localement, sans publier de journaux bruts. La correction du constat est validée par des tests locaux, pas par un nouvel audit Strix. Le point résiduel faible concernant les en-têtes d'adresse Vercel demeure à vérifier sur la plateforme ; la limite indépendante par utilisateur reste appliquée.

## GO automatisé local

| Contrôle exécuté | Résultat |
| --- | --- |
| npm run test:security | 82 réussites, 0 échec, 1 ignoré |
| Contact | 16 réussites ; Redis réel ignoré faute de REDIS_TEST_PORT |
| Authentification et MFA | 19 réussites |
| Schéma et synchronisation SQL | 3 réussites |
| Catalogue et navigation | 4 réussites |
| Stripe et promotions côté client | 21 réussites |
| Administration des promotions | 19 réussites |
| npm run build | Réussi, routes administratives ajoutées, 9 pages statiques et postbuild sitemap |
| npx tsc --noEmit --incremental false | Réussi après le build |
| Migrations | Schéma complet et upgrade des Lots 1–3 exécutés sur PGlite, données historiques et montants conservés |

Les nouveaux tests couvrent : génération, saisie manuelle, collisions, expirations, désactivation, épuisement, restriction client, refus d'un autre client, appels concurrents, consommation par webhook réglé, libération idempotente, prix acquis conservé, autorisation/MFA pour chaque opération, historique, compatibilité script et rollback en cas de panne d'audit. Ils vérifient aussi la limite réelle de 20 créations et la session d'un administrateur déjà enrôlé mais reconnecté sans MFA.

Tests HTTP locaux sur le build : GET promotions sans session = 401 ; sans MFA = 403 ; GET/POST/PATCH depuis une origine étrangère = 403. Expertise et shop = 200 ; aucune offre privée dans le HTML public du shop ; page de démonstration supprimée = 404. Secret de signature éphémère en mémoire pour ces essais, aucun secret local modifié ni enregistré.

## GO visuel simulé

Revue Playwright avec le composant réel, données API simulées et une page locale temporaire. Cette page a été supprimée avant le build final, et n'est pas incluse dans la livraison.

- FR et EN, ordinateur 1440 px et mobile 390 px.
- Ouverture du formulaire et soumission par Entrée au clavier.
- Affichage unique d'un code de démonstration, historique, abonnement, notes et désactivation.
- Aucun débordement horizontal mobile ni erreur JavaScript de page.
- Cinq captures hors dépôt : `../My-website-lot4-review/`. Elles montrent des données fictives, pas un compte administrateur réel ni une qualification des API externes.

## NO-GO fonctionnel externe et risques restants

- Aucun scénario de bout en bout avec Neon, Resend ou Stripe réels n'a été exécuté. Le NO-GO externe du Lot 3 est conservé.
- La migration n'a été appliquée sur aucun service externe.
- Les appels concurrents ont été testés sur PGlite ; aucune preuve multi-connexions réseau Neon/PostgreSQL externe. Aucun exécutable PostgreSQL ou Docker disponible dans les chemins vérifiés.
- Aucun nouvel audit Strix de la branche Lot 4, et aucune CI distante de cette branche locale.
- Les anciens abonnements sans métadonnée de réservation ne sont pas rattachés par supposition ; leurs montants et conditions sont conservés. L'historique des anciens codes ne reconstitue pas des événements antérieurs à la migration.
- Pagination bornée : 50 codes/page, 200 événements/réservations par page, offset maximal 100 000.
- La distribution du code se fait par copie et transmission manuelle ; aucun envoi Resend automatique ajouté.
- Les codes perdus ne sont pas récupérables ; désactiver puis recréer constitue la procédure prévue.
- La réconciliation générale des états Stripe et les fenêtres d'incertitude réseau lors de création d'une session restent dans la qualification externe du Lot 3 ; ce lot ne certifie pas un paiement réel ni un mécanisme général de réparation.

## Fichiers créés (10)
- `app/api/admin/promotions/[id]/route.ts`
- `app/api/admin/promotions/route.ts`
- `components/auth/AdminPromotions.tsx`
- `docs/PROMOTIONS-ADMIN.md`
- `docs/LOT4-QUALIFICATION-2026-11-11.md`
- `drizzle/0003_promotion_admin.sql`
- `lib/billing/promotion-admin-http.ts`
- `lib/billing/promotion-admin.ts`
- `lib/db/promotion-admin-store.ts`
- `tests/promotion-admin.test.mjs`

## Fichiers modifiés (18)
- `app/admin/page.tsx`
- `app/api/account/promotion/route.ts`
- `components/auth/AuthFrame.tsx`
- `components/shop/ShopExperience.tsx`
- `lib/auth/rate-limit.ts`
- `lib/auth/service.ts`
- `lib/billing/checkout.ts`
- `lib/billing/gateway.ts`
- `lib/billing/promotion.ts`
- `lib/billing/store.ts`
- `lib/billing/stripe-gateway.ts`
- `lib/billing/stripe-map.ts`
- `lib/db/billing-store.ts`
- `lib/db/schema.ts`
- `lib/db/statements.ts`
- `package.json`
- `tests/auth-security.test.mjs`
- `tests/billing-stripe.test.mjs`

Aucune dépendance ajoutée, aucun workflow modifié, aucun secret ou fichier .env modifié. Les sources du portfolio, de l'Expertise, de la navigation, les styles globaux et les ressources binaires sont inchangés. Les changements shop concernent uniquement l'affichage des conditions d'une offre privée après autorisation. Le sitemap régénéré a été comparé puis conservé à son état de référence pour exclure les seules différences de dates/ordre.

## Actions utilisateur avant qualification externe
1. Relire les conditions commerciales et le choix de révéler le code une seule fois.
2. Configurer les services de test documentés au Lot 3, sans clé live et sans base de clients réels.
3. Après identification de la base de test et sauvegarde de celle-ci, appliquer les migrations, dont 0003, avec le chargement explicite de l'environnement.
4. Qualifier l'interface avec un compte admin réellement authentifié/MFA, deux clients distincts, codes limités et webhooks Stripe test ; vérifier l'audit et les liens d'abonnement dans PostgreSQL.
5. Exécuter la concurrence multi-connexions et un nouvel audit Strix avant toute décision de publication ou de déploiement.

Décision : **GO pour le développement et la revue locale du Lot 4 ; NO-GO pour la qualification externe, l'activation en production et le déploiement.** Le commit de livraison reste local sur la branche dédiée ; son identifiant est donné dans la réponse de livraison et consultable avec git log. Aucun push, PR Lot 4, fusion ou modification de main n'est autorisé par ce rapport.
