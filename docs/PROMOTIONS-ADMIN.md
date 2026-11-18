# Promotions — administration du Lot 4

Le Lot 4 complète les tables et le Checkout du Lot 3. Il ne crée pas une seconde administration ni un second système de codes.

## Utilisation
Ouvrir `/admin` après connexion par lien magique et validation du second facteur. La section Promotions se trouve après les indicateurs et listes de facturation.

1. Ouvrir « Créer un code », choisir génération sécurisée ou code personnalisé.
2. Choisir Friend Host (10 EUR/mois) ou Friend Care (20 EUR/mois). Aucun montant n'est saisi par l'administrateur. Friend Care comprend au maximum une heure d'intervention par période mensuelle.
3. Renseigner au besoin une expiration, une limite d'utilisations, l'e-mail autorisé, des conditions complémentaires et des notes internes.
4. Créer le code et le copier immédiatement pour le transmettre au client par le canal choisi. Le système n'envoie pas d'e-mail de distribution automatiquement.
5. Consulter les réservations, consommations, clients, abonnements et événements depuis « Historique et abonnements ».
6. Modifier les notes internes ou désactiver le code. L'offre, les conditions, l'expiration, la restriction client et la limite sont immuables ; créer un autre code pour d'autres conditions.

Le code complet est affiché une seule fois. Seuls son empreinte SHA-256 et un suffixe de quatre caractères sont stockés. Un texte perdu n'est pas récupérable ; désactiver et créer un autre code si nécessaire. Les anciens codes créés par script restent valides et apparaissent sans suffixe.

## Règles commerciales et confidentialité
Les offres privées restent absentes du catalogue public et nécessitent une validation serveur. Les conditions fixes de l'offre sont toujours conservées ; les conditions saisies à la création s'y ajoutent. Un client autorisé voit ces conditions, jamais les notes internes ni les données d'autres clients.

La désactivation interdit une nouvelle réservation. Elle ne résilie aucun abonnement et ne change aucun montant contractuel. Une réservation avec Checkout encore ouvert reste utilisable jusqu'à l'expiration réelle de ce Checkout.

Les paramètres de code sont protégés également en PostgreSQL. La désactivation est définitive. Les notes restent modifiables et chaque modification effective est journalisée. Les codes ne sont pas des coupons Stripe.

## Architecture et routes
- `lib/billing/promotion-admin.ts` : autorisation, validation stricte, génération cryptographique de 96 bits, collisions et quotas.
- `lib/db/promotion-admin-store.ts` : administration des tables existantes, requêtes paramétrées, pagination et liens réservation/abonnement.
- `lib/billing/promotion-admin-http.ts` : contrôle d'origine, session administrateur avec MFA, réponses sans cache et erreurs génériques.
- `GET/POST /api/admin/promotions` : liste et création.
- `GET/PATCH /api/admin/promotions/[id]` : détail, notes et désactivation.
- Listes de 50 codes ; détails de 200 réservations/événements par page ; offset borné à 100 000. Consommations et réservations en cours sont comptées séparément.
- `privateOffers` s'appuie sur le catalogue serveur existant. Une future offre privée doit être déclarée avec ses conditions, son prix Stripe validé et les contraintes SQL correspondantes ; aucun changement du fonctionnement général du Checkout n'est requis.

## Réservations et traçabilité
Le verrou PostgreSQL `FOR UPDATE` sur le code existant sérialise les réservations et le contrôle de capacité. Un index unique partiel empêche plusieurs réservations simultanées du même code par un même client.

Les déclencheurs insèrent dans `audit_logs` : création, désactivation, modification de notes, réservation, consommation et libération. Écriture métier et audit appartiennent à la même transaction : l'échec de l'audit annule la mutation. Les journaux ne contiennent ni code brut, ni empreinte de code, ni contenu des notes. L'acteur est l'administrateur pour les mutations administratives, le client pour la réservation, et nul pour les transitions serveur/webhook.

Les nouveaux abonnements portent le lien vers la réservation et une copie des conditions. Le webhook conserve les montants/conditions déjà accordés. Une association à la réservation d'un autre client est refusée. Pour les abonnements historiques dépourvus de cette métadonnée, aucun rattachement incertain n'est inventé.

Les Checkouts nouveaux expirent après 31 minutes (au-dessus du minimum Stripe de 30 minutes). Après les 30 minutes de réutilisation locale, le serveur relit le statut Stripe avant de libérer la réservation : Checkout encore ouvert réutilisé, paiement terminé en attente de synchronisation conservé, panne Stripe sans libération. Une session expirée peut libérer sa réservation ; une nouvelle session ne réutilise plus une réservation libérée. Références : [création de Checkout](https://docs.stripe.com/api/checkout/sessions/create), [expiration](https://docs.stripe.com/api/checkout/sessions/expire).

## Protection contre l'énumération
La faille moyenne du [Strix de référence](https://github.com/nomad403/My-website/actions/runs/42962258650) est corrigée localement : les motifs de refus publics renvoient tous `invalid`, avec le même statut et message, dans l'aperçu comme dans Checkout. Les raisons internes restent distinctes pour les règles métier.

Aperçu : 30 demandes/heure/utilisateur et 60/heure/client lorsque l'adresse est attestée par la plateforme ; la clé client est un HMAC, pas l'adresse en clair. Création admin : 20/heure ; modifications : 60/heure ; lectures administratives : 240/heure par type d'opération. Les appels refusés sont comptabilisés et le limiteur échoue fermé en cas d'indisponibilité. Les nouvelles instances de service partagent le limiteur mémoire en développement ; Redis reste obligatoire en production.

## Migration et prérequis d'un essai réel
Migration additive : `drizzle/0003_promotion_admin.sql`. Elle ajoute les métadonnées administratives, le lien d'abonnement, les index et les fonctions/déclencheurs. Aucun prix ni abonnement existant n'est réécrit. Le découpage des migrations comprend désormais les corps SQL dollar-quotés.

Aucune migration externe n'a été appliquée par l'agent. Après configuration et identification explicite d'une base de test, appliquer les migrations avec une version Node compatible :

```powershell
node --env-file=.env.local --experimental-strip-types scripts/db-migrate.mjs
```

Les scripts Node ne chargent pas `.env.local` implicitement. Le script historique `scripts/create-promotion-code.mjs` reste utilisable ; ses insertions sont aussi journalisées après migration.

Pour la qualification complète : base Neon de test, Resend, session administrateur avec MFA, Redis si mode production, Stripe test et webhooks signés. Les variables du Lot 3 restent inchangées. Ne pas utiliser de clé live ni de base contenant des clients réels.

## Limites de validation
Les tests SQL utilisent PGlite avec des appels concurrents au store. Ils ne démontrent pas une concurrence réseau multi-connexions sur Neon. Aucun PostgreSQL/Docker local n'a été trouvé pour un tel essai complémentaire. Les captures utilisent des réponses API simulées et ne valent pas qualification avec les services externes.

L'audit Strix de la branche de récupération a échoué sur une vulnérabilité moyenne ; il ne signalait aucune vulnérabilité haute ou critique. La correction est testée localement, sans nouvel audit Strix distant de cette branche. Son point résiduel faible sur les en-têtes IP Vercel nécessite une vérification sur l'hébergement. Aucun réglage Vercel n'a été modifié.

La qualification fonctionnelle externe du Lot 3 reste NO-GO. Le Lot 4 doit également être qualifié sur les services de test avant publication ou activation.
