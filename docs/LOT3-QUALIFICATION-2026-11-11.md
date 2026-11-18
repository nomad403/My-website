# Qualification Lot 3 — 11 novembre 2026

Décision : NO-GO global. Aucun déploiement, paiement, appel métier externe ni création de ressource effectué. Lot 4 non commencé. Code applicatif et design inchangés.

## État réel

`docs/SHOP-STRIPE.md` et les sources de facturation ont été inspectés. Ce dossier ne contient pas de `.git` : Git remonte au dépôt parent `C:/Users/Glenn`, puis échoue (`cannot change to`, puis propriété douteuse sans la configuration injectée). Les changements non commités et la comparaison avec les corrections précédentes ne sont donc pas vérifiables. Ne pas considérer le dossier comme propre. Correction proposée : fournir un checkout Git accessible et limité au projet ; ne pas initialiser un dépôt ni modifier la configuration globale par défaut.

Aucun fichier `.env`, `.env.local`, `.env.development[.local]` ou `.env.production[.local]`. Toutes les variables de `.env.auth.example` sont absentes de l'environnement du processus. Stripe CLI non trouvée dans PATH. Aucune valeur sensible affichée.

## GO automatisé — périmètre limité

`npm.cmd run test:security` : code retour 0, 55 tests réussis, 0 échec, 1 ignoré (intégration Redis, REDIS_TEST_PORT absent). Détail : contact 16/17, authentification 17/17, schéma 2/2, catalogue 4/4, Stripe 16/16.

`npx.cmd tsc --noEmit --incremental false` : code retour 0 lors de l'exécution isolée. Une première exécution simultanée au build a échoué car celui-ci régénérait `.next/types` ; ne pas paralléliser ces deux commandes.

La suite Stripe valide avec des doubles locaux : événements anciens et doublons, conflits de statuts à la même seconde avec relecture simulée Stripe, suppression avant création puis reprise, réservation/libération des codes, paiement et remboursement idempotents, signature locale, prix serveur, accès privé et isolation. Les tests de schéma utilisent PGlite ; ils ne qualifient pas la facturation sur Neon ni sa concurrence réelle.

## GO fonctionnel

Aucun scénario exécuté avec Resend, Neon ou Stripe. Aucun GO fonctionnel accordé.

## NO-GO et problèmes

| Problème | Cause / preuve | Gravité | Correction proposée |
| --- | --- | --- | --- |
| Build production échoué | `npm.cmd run build` : Next 15.5.28 choisit le lockfile parent, puis `EPERM readlink C:\\Users\\Glenn` | Bloquant validation build | Définir explicitement la racine de traçage du projet ou utiliser un checkout isolé accessible, puis relancer build et TypeScript séquentiellement |
| Git non vérifiable | Dépôt parent inaccessible ; aucun `.git` local | Bloquant traçabilité | Checkout projet accessible, puis status/diff et contrôle des artefacts générés |
| Services non configurés | Variables absentes et CLI introuvable | Bloquant fonctionnel | Configuration guidée ci-dessous |
| Dates perdues à la même seconde | `subscriptionWrite(100,100,'active','active')` retourne `ignore`. `upsertSubscription` ne met alors à jour aucune date et ne demande pas de relecture Stripe | Majeure | Réconcilier aussi les événements distincts de même seconde et même statut lorsque les dates peuvent changer. Ajouter un test de résiliation programmée conservant `active` |
| Concurrence PostgreSQL non qualifiée | Les écritures de facturation lisent puis mettent à jour les lignes ; les essais mémoire ne démontrent pas leur ordre sous webhooks simultanés | Risque majeur à vérifier, pas régression démontrée | Exécuter événements concurrents sur PostgreSQL test ; si nécessaire verrouillage ou conditions atomiques sur les horodatages |

Le défaut de dates est reproduit localement ; son caractère nouveau par rapport à une révision précédente ne peut pas être établi sans historique Git. Aucun autre défaut fonctionnel externe n'est démontré.

## Configuration indispensable

1. Utiliser uniquement une base/branche Neon de test déjà autorisée. Renseigner `DATABASE_URL` et `DATABASE_SSL=require` dans `.env.local`, ignoré par les règles locales. Ne pas transmettre la connexion dans le chat.
2. Renseigner `AUTH_SECRET` (au moins 32 caractères), `AUTH_MFA_KEY` (32 octets aléatoires encodés base64), `APP_URL=http://localhost:3000` et les adresses choisies dans `ADMIN_EMAILS`. Prévoir deux comptes clients distincts et un administrateur avec authentificateur TOTP.
3. Resend : renseigner une clé et un expéditeur autorisé dans `RESEND_API_KEY` et `RESEND_FROM`. Vérifier la possibilité de recevoir effectivement le lien sur les adresses de qualification. Aucun expéditeur ni domaine n'est présumé disponible.
4. Stripe : utiliser uniquement les clés `sk_test_` et `pk_test_` du même compte test. Laisser `STRIPE_ALLOW_LIVE` absent. Fournir les huit identifiants de prix de SHOP-STRIPE.md : Essential 19€/mois et 190€/an, Plus 49€/mois et 490€/an, Premium 69€/mois et 690€/an, Friend Host 10€/mois et Friend Care 20€/mois. Si ces ressources n'existent pas, leur création attend l'accord utilisateur.
5. Customer Portal test : autoriser factures, moyen de paiement et résiliation ; désactiver changement de formule/prix/période. Choisir explicitement résiliation immédiate ou en fin de période. En fin de période, un abonnement peut rester `active` jusqu'à l'échéance : vérifier les dates avant d'attendre `canceled`.
6. Installer/rendre accessible Stripe CLI, authentifier le compte test, puis lancer `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Reporter son secret de signature dans `STRIPE_WEBHOOK_SECRET`, sans le publier. Ne pas utiliser `--live`.
7. Les scripts Node de migration et de code privé ne chargent pas `.env.local` automatiquement. Avec une version Node compatible avec `--env-file` et le strip TypeScript : `node --env-file=.env.local --experimental-strip-types scripts/db-migrate.mjs`. Vérifier ensuite les deux migrations dans `schema_migrations`. Les migrations ne seront exécutées qu'après identification de la base test.
8. Lancer `npm.cmd run dev`. Pour les codes de qualification, utiliser le script documenté avec le même chargement explicite de `.env.local`. Choisir un code éphémère, une limite de 1 et une adresse de test. Redis n'est pas requis en développement ; il l'est pour le limiteur en production.

Références officielles : [Stripe CLI](https://github.com/stripe/stripe-cli), [connexion Neon](https://github.com/neondatabase/website/blob/main/content/docs/cli/connection-string.md), [tests Resend](https://resend.com/changelog/sending-test-emails). Les ressources ou identités manquantes ne sont pas inventées.

## Matrice fonctionnelle à exécuter

Chaque ligne est NON EXÉCUTÉE, bloquée par la configuration externe.

| Scénario | Preuve attendue |
| --- | --- |
| 1. Compte par lien magique | Mail réellement reçu et lien consommé une seule fois |
| 2. Session persistante | Rechargement et session PostgreSQL ; révocation au logout |
| 3–4. Essential mensuel et succès | Checkout test au prix serveur 1900 centimes EUR/mois, paiement de test |
| 5–6. Webhook et activation | Signature acceptée, événement enregistré, abonnement PostgreSQL actif après webhook |
| 7–8. Shop et admin | Même abonnement visible ; admin accessible uniquement après MFA |
| 9. Facture et encaissement | Identifiants concordants avec Stripe ; facture et paiement séparés |
| 10. Refus | Aucun encaissement supplémentaire ; contrôler les événements réellement émis (un refus Checkout ne garantit pas invoice.payment_failed) |
| 11–12. Portal et résiliation | Dates puis statut conformes au choix immédiat/fin de période |
| 13–14. Code privé et limites | Prix privé autorisé, deuxième compte refusé à limite 1 ; variantes expirée/désactivée/autre adresse ; réservations concurrentes |
| 15. Aucune double comptabilisation | Rejouer les mêmes événements, comparer nombres de lignes et sommes avant/après |
| Échec temporaire et reprise | Provoquer un échec contrôlé sur environnement test, constater HTTP 500 sans marqueur traité, restaurer et rejouer le même événement signé ; constater une seule écriture financière |
| Réconciliation | Provoquer deux statuts de même seconde avec relecture Stripe ; comparer statut/dates PostgreSQL à Stripe et prix contractuel inchangé |
| Isolation | Comptes A/B : aucune facture, session portail ni souscription de A accessible à B |

La relecture automatique existante ne constitue pas une réconciliation générale : elle concerne les conflits de statuts à la même seconde. Aucun outil général de réparation n'a été trouvé dans les scripts inspectés. Définir et tester un mécanisme de rejeu signé compatible avec le listener local ; ne pas présumer qu'un renvoi Dashboard destiné à un endpoint enregistré atteint ce listener. Ne pas archiver de payloads contenant des secrets ou des données personnelles.

## Sécurité : portée des preuves

Les tests locaux réussissent pour le refus des clés live sans opt-in, l'isolation des clients, les prix serveur, les codes privés et le MFA admin. Le code autorise techniquement les clés live avec `STRIPE_ALLOW_LIVE=true` : ce n'est pas une interdiction absolue ; cette variable doit rester absente pour la qualification.

La redirection Checkout n'active pas elle-même l'abonnement ; l'écriture passe par la synchronisation des événements. Les erreurs inspectées dans les routes de facturation journalisent des messages génériques. Aucun secret n'a été affiché dans cette session ni inscrit dans ce rapport. Les journaux réels des fournisseurs et du serveur configuré restent à inspecter lors des essais ; leur absence de secrets n'est pas certifiée.
