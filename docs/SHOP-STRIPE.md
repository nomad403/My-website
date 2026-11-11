# Shop — Stripe en mode test

Ce document décrit la configuration du Lot 3. Aucune clé réelle ne doit être collée ici, ni commitée. Le mode live reste désactivé : ne pas définir `STRIPE_ALLOW_LIVE`.

## Variables

Les recopier dans l'environnement local à partir de `.env.auth.example`.

| Variable | Rôle |
| --- | --- |
| `STRIPE_SECRET_KEY` | Clé secrète `sk_test_` |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique `pk_test_` |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature `whsec_` |
| `STRIPE_PRICE_ESSENTIAL_MONTHLY` | Prix 19 € / mois |
| `STRIPE_PRICE_ESSENTIAL_YEARLY` | Prix 190 € / an |
| `STRIPE_PRICE_PLUS_MONTHLY` | Prix 49 € / mois |
| `STRIPE_PRICE_PLUS_YEARLY` | Prix 490 € / an |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Prix 69 € / mois |
| `STRIPE_PRICE_PREMIUM_YEARLY` | Prix 690 € / an |
| `STRIPE_PRICE_FRIEND_HOST_MONTHLY` | Prix privé 10 € / mois |
| `STRIPE_PRICE_FRIEND_CARE_MONTHLY` | Prix privé 20 € / mois |

`STRIPE_SECRET_KEY` et `STRIPE_PUBLISHABLE_KEY` doivent être du même mode. Une clé `sk_live_` ou `pk_live_` est refusée tant que `STRIPE_ALLOW_LIVE` n'est pas exactement `true`. Cette valeur ne doit pas être posée pour ce lot. La clé publique n'est pas envoyée au navigateur : Checkout est hébergé par Stripe.

La migration `drizzle/0002_stripe.sql` s'applique avec :

```bash
npm run db:migrate
```

## Produits et prix

Dans le Dashboard Stripe, rester sur **Test mode**.

Créer cinq produits récurrents, en euros, sans code promo Stripe :

1. Essential — 19,00 € / mois et 190,00 € / an.
2. Plus — 49,00 € / mois et 490,00 € / an.
3. Premium — 69,00 € / mois et 690,00 € / an.
4. Friend Host — 10,00 € / mois seulement.
5. Friend Care — 20,00 € / mois seulement.

Chaque prix doit être de type récurrent. Copier les identifiants `price_` dans les variables ci-dessus. Au moment du paiement, le serveur relit le prix Stripe et refuse la session si la devise, le montant ou la période ne correspondent pas au catalogue.

Friend Host et Friend Care ne sont pas affichés dans le catalogue public. Ils s'ouvrent uniquement avec un code privé valide. Le montant est copié sur l'abonnement et n'est pas réécrit ensuite.

## Codes privés

Les codes ne sont pas des coupons Stripe. Seul leur empreinte SHA-256 est stockée.

```bash
node --experimental-strip-types scripts/create-promotion-code.mjs --code VOTRE-CODE --plan friend_host --max 1 --expires 2027-01-01T00:00:00.000Z --email client@example.com
```

`--plan` accepte `friend_host` ou `friend_care`. `--expires`, `--max` et `--email` sont facultatifs. Le code fait 6 à 32 caractères, lettres, chiffres et tirets. Le script n'affiche pas le code. `DATABASE_URL` doit pointer vers la base de test.

Un code peut expirer, atteindre sa limite, être réservé à une adresse, ou être désactivé en renseignant `disabled_at`. La désactivation n'enlève pas un tarif déjà accordé. La réservation est consommée quand le paiement est confirmé, et libérée si la session expire, échoue ou si Stripe refuse le tarif.

## Webhook

Endpoint : `https://<origine>/api/stripe/webhook`.

En local :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copier le secret `whsec_` affiché par la CLI dans `STRIPE_WEBHOOK_SECRET`. Ne pas le committer.

Événements à envoyer :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.finalized`
- `invoice.paid`
- `invoice.updated`
- `invoice.payment_failed`
- `refund.created`
- `refund.updated`
- `charge.refunded`

La signature est vérifiée. Un événement déjà traité est ignoré. Un événement plus ancien ne remplace pas un statut déjà enregistré. Deux événements horodatés à la même seconde ne s'écrasent pas : le webhook relit alors l'abonnement courant chez Stripe et n'en retient que le statut et les dates. Le montant, la formule et la période restent ceux copiés à la création.

Si la suppression d'abonnement arrive avant sa création, si la facture arrive avant l'abonnement, ou si le remboursement arrive avant le paiement, la réponse est 500. L'événement n'est pas marqué traité, Stripe peut donc le renvoyer. Un renvoi réécrit la même ligne, identifiée par l'identifiant Stripe, sans second encaissement ni second remboursement.

L'abonnement n'est pas activé par le retour du navigateur sur `/shop`.

## Customer Portal

Dans le Dashboard test, ouvrir **Settings > Billing > Customer portal**.

Autoriser :

- la mise à jour du moyen de paiement ;
- la consultation des factures ;
- la résiliation de l'abonnement.

Laisser désactivé le changement de formule, de prix ou de période. Un `customer.subscription.updated` qui proposerait un autre montant ne réécrit pas le prix contractuel. Si le portail autorisait ce changement, Stripe facturerait un prix différent de celui conservé dans PostgreSQL.

Le bouton de `/shop?section=billing` ouvre ce portail et ramène le client sur la même section. Il reste indisponible tant qu'aucun client Stripe n'est associé au compte.

## Essai local

1. Appliquer les migrations.
2. Renseigner les variables test et `DATABASE_URL`.
3. Lancer `stripe listen` vers le webhook local.
4. Lancer `npm run dev`.
5. Ouvrir `/shop`, se connecter avec le lien magique, puis choisir Mensuel ou Annuel.
6. Souscrire. Le navigateur part sur Checkout Stripe, puis revient sur `/shop`.
7. Attendre le webhook avant de considérer l'abonnement actif. La section Abonnements affiche la ligne réelle ; Facturation affiche les factures synchronisées.

Cartes de test Stripe, sans paiement réel :

- succès : `4242 4242 4242 4242` ;
- refus : `4000 0000 0000 0002` ;
- paiement différé : un moyen de test asynchrone, par exemple un prélèvement SEPA de test. L'abonnement reste incomplet tant que `checkout.session.async_payment_succeeded` n'est pas reçu.

Date d'expiration quelconque dans le futur, CVC quelconque.

## Validation d'un abonnement

Un abonnement est validé quand PostgreSQL contient une ligne `active` ou `trialing` écrite par un webhook, avec le montant du catalogue ou du code privé. Le paramètre `checkout=success` affiche seulement que le retour navigateur ne suffit pas.

Contrôles :

- une souscription mensuelle et une souscription annuelle créent deux sessions, avec les bons `price_` ;
- un second clic sur la même formule réutilise la session ouverte pendant 30 minutes ;
- un code valide affiche 10 € ou 20 €, puis Checkout utilise ce prix ;
- un code invalide, expiré, désactivé, épuisé ou réservé à une autre adresse n'affiche aucun tarif privé ;
- l'administration affiche les clients, abonnements, factures et paiements réels, ou un état vide explicite.

Les six indicateurs restent séparés : MRR et ARR théoriques, factures émises, encaissements, remboursements, impayés. Une facture émise n'est pas un encaissement. Un remboursement n'est pas soustrait des encaissements.

## Paiement refusé

Après un refus :

- la facture reste ouverte, avec un reste à payer ;
- le paiement est `failed`, avec un code d'échec Stripe lorsque Stripe l'envoie ;
- l'encaissé n'augmente pas ;
- l'impayé augmente ;
- l'abonnement peut rester `incomplete`, `past_due` ou `unpaid` selon l'événement d'abonnement.

Le diagnostic se fait dans l'administration et dans le Dashboard Stripe test, à partir de l'identifiant de facture ou de paiement. Aucune donnée de carte n'est stockée dans PostgreSQL.

## Qualification fonctionnelle

Les tests `npm run test:security` couvrent la synchronisation, les codes et les webhooks avec un magasin en mémoire et des signatures locales. Ils ne parlent ni à Resend, ni à Neon, ni à Stripe. Tant que la procédure ci-dessous n'a pas été exécutée, ces scénarios restent ouverts.

Le dépôt ne contient pas de fichier `.env` renseigné. Créer `.env.local`, déjà ignoré par Git, et y placer les valeurs. Ne pas les coller dans une conversation.

Variables à renseigner avant l'essai réel :

- `DATABASE_URL`, `DATABASE_SSL=require` pour Neon
- `AUTH_SECRET`, `AUTH_MFA_KEY`, `APP_URL=http://localhost:3000`, `ADMIN_EMAILS`
- `RESEND_API_KEY`, `RESEND_FROM`
- `STRIPE_SECRET_KEY` en `sk_test_`, `STRIPE_PUBLISHABLE_KEY` en `pk_test_`, `STRIPE_WEBHOOK_SECRET` en `whsec_`
- les identifiants `STRIPE_PRICE_*` listés plus haut
- laisser `STRIPE_ALLOW_LIVE` vide
- `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` seulement pour un essai en `NODE_ENV=production` ; en développement local, le limiteur mémoire suffit

### Neon

1. Utiliser une base ou une branche de test, jamais la base de production si elle reçoit des clients réels.
2. Depuis le projet, avec `DATABASE_URL` pointant vers cette base :

```bash
npm run db:migrate
```

3. Vérifier dans la console Neon que `0001_foundations.sql` et `0002_stripe.sql` apparaissent dans `schema_migrations`.
4. Les tables attendues après le Lot 3 sont `promotion_codes`, `promotion_redemptions`, `checkout_sessions` et `stripe_events`. Les tables `subscriptions`, `invoices`, `payments` et `refunds` ont la colonne `last_event_created`.

### Stripe Dashboard, mode test

1. Rester sur Test mode.
2. Créer les cinq produits et les prix indiqués dans la section Produits et prix. Copier chaque `price_` dans `.env.local`.
3. Customer portal : moyen de paiement, factures, résiliation. Changement de formule désactivé.
4. Dans un second terminal :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copier le `whsec_` affiché par cette commande dans `STRIPE_WEBHOOK_SECRET`. Le relancer si le secret change.

### Commandes locales

```bash
npm run dev
node --experimental-strip-types scripts/create-promotion-code.mjs --code VOTRE-CODE --plan friend_host --max 1
npm run test:security
npx tsc --noEmit --incremental false
```

### Scénarios à exécuter à la main

Ces étapes ne sont pas validées par la suite automatisée :

1. Demander un lien magique sur `/shop` et le recevoir par Resend.
2. Ouvrir le lien, puis recharger : la session vient de PostgreSQL.
3. Souscrire à Essential mensuel. Stripe crée un client test et Checkout s'ouvre.
4. Payer avec `4242 4242 4242 4242`.
5. Voir dans le terminal `stripe listen` un webhook signé accepté.
6. Revenir sur `/shop?section=subscriptions` : l'abonnement est actif seulement après ce webhook.
7. Ouvrir `/shop?section=billing` : la facture payée apparaît.
8. Ouvrir `/admin` avec le second facteur : le client, l'abonnement, la facture, le paiement et l'encaissé apparaissent.
9. Recommencer un paiement avec `4000 0000 0000 0002` : paiement `failed`, impayé augmenté, encaissé inchangé.
10. Résilier depuis le Customer Portal : le statut devient `canceled` et le MRR théorique baisse.
11. Code privé valide, code expiré, code déjà consommé, code réservé à une autre adresse.

Aucun de ces onze scénarios n'a été exécuté contre Resend, Neon ou Stripe dans cette qualification.
