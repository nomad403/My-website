# LOT 7B.1 — Guide opérationnel de configuration externe

11 novembre 2026 — Nomad403 Shop. Branche qualification/shop-lot-7, HEAD 1e5f3b5e0b85064633f9e319d69380f5a773f0ca.

Référence lue intégralement : [LOT7A-READINESS.md](LOT7A-READINESS.md). Les 61 scénarios y restent non exécutés avec les services réels.

**Livrable : une procédure, pas un provisionnement.** Aucun service externe n'a été créé/configuré dans cette phase. Aucun secret généré, installé ou modifié, aucune migration, connexion métier distante, émission d'e-mail, paiement, publication ou déploiement effectué. Le Lot 7B.2 n'est pas commencé.

## Mode d'emploi et responsabilités

Chaque action porte sa catégorie :
- **A — automatique locale** : lecture du dépôt, vérification de cohérence, inventaire de présence sans valeurs, rédaction et recherche de secrets. Ces actions sont possibles maintenant, sans appel métier aux services.
- **B — intervention du propriétaire** : connexion aux consoles avec ses accès/MFA, choix des comptes/cibles, contrôle des restrictions, saisie des secrets dans un coffre, attestation des preuves non secrètes.
- **C — autorisation explicite** : création de ressources, changement distant de configuration/secret/DNS, connexion de test avec des identifiants, migration, envoi, paiement même simulé, déploiement, test de panne ou audit payant. Aucune de ces actions n'est couverte par la seule rédaction de ce guide.

Une action peut être **B+C** : le propriétaire doit intervenir ET l'action modifie un service. La catégorie B n'est pas une permission implicite de modifier. Les étapes C sont décrites pour une exécution future, pas exécutées ici.

Constats vérifiés maintenant :
- Branche/HEAD conformes ; main reste 26e5de2aac1a20be225411d18a86b3a05897f883.
- Aucun .env* non example, aucune variable applicative renseignée dans le processus inspecté ; huit STRIPE_PRICE_* absentes.
- Aucun lien .vercel/project.json ni vercel.json local. Leur absence ne prouve rien sur un projet Vercel distant.
- Aucun connecteur Neon, Stripe, Resend ou Vercel disponible dans cette session : identité des comptes, offres, prix réellement créés, domaines vérifiés, variables distantes et automatisations **non inspectés**. Ne jamais convertir « inconnu » en « configuré ».
- Le guide 7A reste inchangé et non commité. Aucun changement applicatif n'est nécessaire à cette livraison documentaire.

## 1. Actions Neon — en premier

### N1 — Choisir la cible et les limites [B]

Dans la console Neon, identifier l'organisation propriétaire et choisir un **projet de qualification distinct**, avec base vide et comptes techniques indépendants. Aucun clone/dump de clients de production. Ne pas créer une branche ordinaire à partir de production : elle peut reprendre ses données. Le nom d'une branche « test » ne garantit pas l'absence de données réelles. [Branches Neon](https://neon.com/docs/manage/branches).

À consigner dans le manifeste privé : organisation/projet/branche/compute/base, région, version PostgreSQL, rôle applicatif, rôle migrateur, offre/coût/plafond, responsable et attestation hors production. Aucun identifiant n'est fourni : aucun nom ou URL effectif n'est inventé.

Sortie attendue : choix documenté et validation explicite C-N avant création. Si une cible existe déjà, la lire dans la console ne dispense pas de vérifier sa provenance et les permissions avant utilisation.

### N2 — Créer la base vide et préparer les droits [B+C-N]

Après accord seulement, créer le projet/base dédiés et leurs accès. Ne pas accepter une intégration qui relie automatiquement le projet de production à Vercel.

Prévoir :
- Rôle migrateur limité à la cible de qualification, autorisé à créer types, tables, index, séquences, fonctions et triggers des migrations.
- Rôle applicatif distinct, sans DDL ni accès aux données de production ; droits requis pour utilisateurs, sessions, audits, paiements, promotions et interventions, y compris séquences et écritures par triggers.
- TLS obligatoire et politique de réseau examinée selon l'offre. Aucune liste d'IP Vercel fixe ne doit être supposée : vérifier les possibilités réelles de sortie réseau avant de définir une allowlist Neon.
- Sauvegarde/point de restauration de la base test avant l'essai ultérieur de mise à niveau. Aucune restauration/suppression automatique.

Les GRANT exacts devront être validés sur le schéma migré : aucune recette de privilèges non testée n'est appliquée ici.

### N3 — Séparer connexion directe et poolée [B, puis C pour toute connexion réelle]

Depuis Connect, choisir explicitement branche/base/rôle :
- **Connexion directe** : réservée au futur migrateur, aux diagnostics de session et aux observations de contention.
- **Connexion poolée** : candidate au runtime Preview, sur la **même base de qualification**, rôle applicatif. Le driver existant utilise prepare:false et max:1 par processus ; la compatibilité des transactions/SET LOCAL doit être qualifiée.
- Copier les deux secrets dans des entrées de coffre distinctes. Ne pas mettre le rôle migrateur dans l'environnement de l'application. Ne pas imprimer les URL.

Le code n'a qu'une variable DATABASE_URL. Il n'existe pas de DATABASE_DIRECT_URL ou DATABASE_POOL_URL exploité automatiquement : le lanceur de migration devra sélectionner explicitement son entrée directe, et le runtime son entrée applicative. [Pooling Neon](https://neon.com/docs/connect/connection-pooling).

### N4 — Préparer les migrations sans les lancer [A]

Ordre vérifié dans drizzle/ :
1. 0001_foundations.sql — comptes, sessions/MFA, contrats et facturation.
2. 0002_stripe.sql — Checkout, événements et réservations.
3. 0003_promotion_admin.sql — promotions administrées et conditions immuables.
4. 0004_client_interventions.sql — demandes, historique, temps et droits.
5. 0005_admin_pilotage.sql — priorité interne, observations, total de facture, remboursement et verrou de livraison.

Aucune autre migration SQL présente. Digests de référence dans 7A ; les octets seront revérifiés avant exécution.

Le migrateur :
- reçoit DATABASE_URL du processus ; npm run db:migrate ne charge pas .env.local tout seul ;
- compare les noms dans schema_migrations, sans checksum stocké ni verrou entre deux migrateurs ;
- traite un fichier par transaction, pas les cinq en une transaction globale.

Conséquences : un seul opérateur/lancement, session propre sans DATABASE_URL héritée, connexion directe attestée, snapshot test, puis contrôle ultérieur des cinq entrées, contraintes et triggers. Un échec n'autorise pas reset, effacement de reçus ou lancement concurrent. **Aucune commande de migration exécutée en 7B.1.**

### N5 — Préparer la concurrence [A+B, exécution future C-CONC]

Deux requêtes dans une seule instance max:1 ne prouvent pas une concurrence PostgreSQL. Prévoir deux processus/connexions applicatives indépendants sur la même base et le même Redis de qualification ; authentification réelle de deux acteurs de test.

Preuves futures : connexions distinctes observables, réservation max=1 jamais dépassée, deux clôtures 40+40 sur solde 60 sans dépassement, webhooks en concurrence avec reçu/historique/état atomiques. Le verrou global billing_sync_lock et les délais de 5 s seront mesurés ; pas de débit supposé acquis sur la base des tests PGlite.

## 2. Actions Stripe — configuration test seulement

### S1 — Identifier le sandbox [B]

Dans le sélecteur de compte, relever l'identité du compte/sandbox propriétaire. Privilégier un sandbox dédié, sans copie manuelle des secrets live. Ne pas supposer que tous les réglages du mode test historique sont indépendants du live ; vérifier le contexte avant chaque modification. [Sandboxes Stripe](https://docs.stripe.com/sandboxes).

Conditions de préparation : clés exclusivement sk_test_ et pk_test_, même sandbox ; aucun --live, STRIPE_ALLOW_LIVE absent ou false. Le code accepte le live si ce flag vaut exactement true : il faut contrôler sa valeur effective et les héritages, pas seulement le fichier example.

### S2 — Produits et correspondance des huit prix [A pour les attentes, B pour lecture, C-STRIPE pour création]

Le catalogue lib/shop/plans.ts et les noms lus dans stripe-env.ts correspondent aux huit lignes suivantes. **Les Price IDs distants ne sont pas fournis : correspondance réelle non vérifiée.**

| Produit / code | Tarif contractuel | Montant mineur EUR | Récurrence attendue | Variable | Price ID distant |
|---|---|---:|---|---|---|
| Essential / essential | 19 €/mois | 1900 | month, interval_count=1 | STRIPE_PRICE_ESSENTIAL_MONTHLY | À relever |
| Essential / essential | 190 €/an | 19000 | year, interval_count=1 | STRIPE_PRICE_ESSENTIAL_YEARLY | À relever |
| Plus / plus | 49 €/mois | 4900 | month, interval_count=1 | STRIPE_PRICE_PLUS_MONTHLY | À relever |
| Plus / plus | 490 €/an | 49000 | year, interval_count=1 | STRIPE_PRICE_PLUS_YEARLY | À relever |
| Premium / premium | 69 €/mois | 6900 | month, interval_count=1 | STRIPE_PRICE_PREMIUM_MONTHLY | À relever |
| Premium / premium | 690 €/an | 69000 | year, interval_count=1 | STRIPE_PRICE_PREMIUM_YEARLY | À relever |
| Friend Host / friend_host | 10 €/mois, privé | 1000 | month, interval_count=1 | STRIPE_PRICE_FRIEND_HOST_MONTHLY | À relever |
| Friend Care / friend_care | 20 €/mois, privé | 2000 | month, interval_count=1 | STRIPE_PRICE_FRIEND_CARE_MONTHLY | À relever |

Créer après accord seulement **cinq produits et huit prix** simples récurrents. Pas de prix annuel privé, de prix à paliers/quantités variables ou de coupon Stripe ajouté pour remplacer le moteur de codes privés.

Pour chaque ligne, relever à partir du sandbox : product.id, price.id, active, livemode=false, currency=eur, unit_amount, type=recurring, recurring.interval et interval_count=1. Vérifier que le produit est actif et appartenant au même sandbox. Le préfixe price_ ne prouve aucun de ces éléments.

Le contrôle applicatif existant compare montant/devise/intervalle, mais retrievePrice n'expose pas tous les attributs ci-dessus (notamment interval_count/livemode) : la fiche de preuve complète est nécessaire. Une erreur doit être corrigée par un nouveau prix test adapté et une configuration de qualification autorisée, jamais par un changement du tarif contractuel ou du catalogue pour faire passer un test.

### S3 — Checkout [A : lecture, C-STRIPE : configuration]

Réutiliser le gateway existant : mode subscription, quantity=1, Checkout hébergé Stripe, URL de succès/annulation issues de APP_URL. Pas de Payment Link ni second moteur de paiement. allow_promotion_codes=false : les codes privés viennent du Lot 4.

Le gateway renseigne userId, planCode, billingInterval, amountCents, privateOffer et redemptionId dans les métadonnées Checkout et abonnement. Ne pas créer de faux IDs locaux ou de métadonnées d'utilisateur inventées pour contourner la connexion.

Préparer les méthodes de paiement strictement simulées et les paramètres de facturation du sandbox, sans créer de session Checkout ni cliquer un paiement dans cette phase. Ne pas activer taxes/remises supplémentaires implicitement : documenter leur effet et les réserver aux scénarios financiers approuvés.

### S4 — Customer Portal [B+C-STRIPE]

Dans les réglages Billing/Customer Portal du sandbox :
- Autoriser consultation factures, mise à jour du moyen de paiement et résiliation.
- Choisir/documenter résiliation en fin de période ou immédiate pour les scénarios concernés.
- Désactiver changement de formule, prix, périodicité et quantité ; ne pas permettre une divergence avec le contrat figé.
- Retour attendu vers APP_URL/shop?section=billing, sur l'origine de test.

**Le gateway n'envoie aucun configuration ID à billingPortal.sessions.create** : c'est la configuration par défaut du sandbox qui doit convenir. Créer une configuration secondaire sans en faire celle effectivement utilisée ne prépare pas le parcours existant. Aucun STRIPE_PORTAL_CONFIGURATION_ID n'est implémenté. [Réglages Portal](https://docs.stripe.com/customer-management/configure-portal).

### S5 — Webhooks, destination et accès [A pour le plan, B+C-WEBHOOK pour configuration]

L'URL finale dépend de la Preview choisie en étape 4. Préparer la liste maintenant ; ne pas déclarer l'endpoint prêt avant que l'URL approuvée existe et que sa protection soit compatible. Cette dépendance impose un retour à S5 après le futur déploiement de test, autorisé séparément en 7B.2.

Choisir une voie :
- Endpoint HTTPS dédié à l'origine de qualification, chemin /api/stripe/webhook.
- Listener Stripe CLI local vers une instance test autorisée, pour un périmètre partiel clairement identifié.

Ne pas mélanger les whsec_ du listener et du Dashboard ni envoyer un endpoint de test vers le site de production. Enregistrer la version API, le type snapshot compatible et les événements :
- checkout.session.completed ; checkout.session.async_payment_succeeded ; checkout.session.async_payment_failed ; checkout.session.expired.
- customer.subscription.created ; customer.subscription.updated ; customer.subscription.deleted.
- invoice.finalized ; invoice.paid ; invoice.updated ; invoice.payment_failed.
- refund.created ; refund.updated ; charge.refunded.

Une destination « enregistrée » n'est pas une livraison réussie. Preview Protection peut renvoyer une page de connexion avant le handler, même avec une signature Stripe correcte. Ne pas supposer que Stripe peut joindre la Preview ni qu'un réglage WAF contourne cette protection. Voir [webhooks Stripe](https://docs.stripe.com/webhooks) et étape 4.

### S6 — Factures, paiements, remboursements et mapping [A : inspection, vérification réelle en 7B.2]

| Événement | Données locales attendues | Point de contrôle |
|---|---|---|
| checkout.session.completed / async_payment_succeeded | checkout_sessions et consommation du code après confirmation | Le retour navigateur seul n'active rien ; subscription peut arriver séparément |
| checkout.session.async_payment_failed / expired | Checkout expiré/échoué, libération de réservation | Ne pas consommer définitivement une réservation sans confirmation |
| customer.subscription.created / updated | subscriptions, ancrage/périodes/statut et observations | Prix/conditions historiques conservés, revue sur divergence |
| customer.subscription.deleted | État canceled et date effective | Suppression avant création peut nécessiter retry sans reçu |
| invoice.finalized / paid / updated / payment_failed | invoices et, si PaymentIntent mappé, payments | Total distinct du solde dû, période de service et user/subscription corrects |
| refund.created / updated ; charge.refunded | refunds liés au paiement, une ligne par ID | Tous les remboursements présents mappés, pas de double compte entre types |
| Livraison traitée | stripe_events, historique et état dans la transaction | Aucun reçu commité si retry ; pas de suppression de reçus pour forcer une réparation |

Bloquant de validation financière : paymentFromInvoice lit payment_intent direct/objet ; il ne déroule pas invoice.payments. La version API réelle peut fournir une structure différente. Relever les versions SDK/endpoint/compte et préparer l'inspection d'un vrai payload test expurgé avant de conclure sur les encaissements. Une facture paid sans paiement lié ne suffit pas. Aucune compatibilité distante n'est attestée ici.

Préparer le relevé des futurs IDs facture/PaymentIntent/refund et des soldes, jamais leurs données de carte ou signatures. Les refunds ne sont pas soustraits des encaissements bruts ; leur date locale est celle du premier événement de succès accepté, pas un règlement bancaire certifié. Les retards/égalités/reprises suivront S14–S19 du rapport 7A. Aucun paiement, remboursement ni événement de test déclenché en 7B.1.

## 3. Actions Resend — aucun envoi

### R1 — Compte, expéditeur et restrictions [B]

Ouvrir la console propriétaire et relever : workspace/compte, domaine/sous-domaine envisagé, statut de vérification, restrictions, quota/plafond disponible et permission de la clé envisagée. Ces éléments sont actuellement **inconnus**, pas « validés ».

Choisir des boîtes contrôlées distinctes pour admin-Q, client-A, client-B, client-C-concurrence et client-N-sans-abonnement. Ne pas employer des adresses de clients réels ni des adresses inexistantes. Les adresses Resend simulant des événements ne donnent pas accès au mail contenant le lien magique.

Le domaine d'essai resend.dev n'autorise normalement que l'adresse du compte ; il ne suffit donc pas à une campagne multi-clients. Confirmer les restrictions réelles avant toute émission. [Restriction resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

### R2 — Domaine et clé [B+C-RESEND]

Après accord :
1. Préférer un sous-domaine d'envoi dédié dont le propriétaire contrôle les DNS. Ne pas inventer son nom ni modifier la messagerie du domaine de production.
2. Ajouter/valider le domaine et appliquer seulement les enregistrements demandés par Resend, sur le périmètre approuvé. Vérifier DKIM/SPF et la politique DMARC ; ne pas remplacer arbitrairement les MX existants. [Domaines Resend](https://resend.com/docs/dashboard/domains/introduction).
3. Générer une clé indépendante, permission sending_access et restriction au domaine de test, puis l'enregistrer directement dans le coffre. Le préfixe d'une clé Resend ne désigne pas un mode « test » garantissant l'absence d'envoi réel. [Permissions des clés](https://resend.com/docs/api-reference/api-keys/create-api-key).
4. Préparer RESEND_FROM et, seulement pour les essais contact, RESEND_TO vers une boîte contrôlée. Définir un plafond d'envois explicitement accepté ; aucun « send test email » de la console à ce stade.

Ne pas importer de contacts ni activer broadcast/campagne, séquence ou notifications d'intervention. L'outbox Lot 5 n'a pas de worker d'envoi.

### R3 — Empêcher l'envoi involontaire [A+B ; configuration distante C]

La présence de RESEND_API_KEY et RESEND_FROM rend le mailer configuré, pas qualifié. L'application ne possède pas d'allowlist générale de destinataires ; ADMIN_EMAILS choisit les administrateurs, **pas** les seuls destinataires autorisés.

Ne pas charger une clé d'envoi fonctionnelle dans une Preview accessible à tous avant revue de ses protections et du plafond : n'importe quel email valide pourrait être soumis au magic link, dans les limites de débit. Prévoir accès limité aux testeurs et Redis dédié. Les requêtes d'authentification métier ne sont pas des préflights inoffensifs.

Avant le premier envoi autorisé en 7B.2 : confirmer les logs d'accès/proxy, HAR et outils de replay. Le token est dans la query du magic link ; ne pas conserver sa valeur, de cookie, QR/seed TOTP ou codes de récupération dans les captures. Les contrôles de délivrabilité et le lien reçu restent non testés.

## 4. Actions Vercel — plan Preview isolé, sans déployer

### V1 — Relever la configuration existante [B, lecture seulement]

Dans le compte/projet propriétaire, relever sans afficher les valeurs secrètes :
- Team/project ID, dépôt lié, branche de production effective et règles de déploiement Git.
- Variables Development/Preview/Production : noms, portées, overrides par branche et intégrations partagées.
- Domaines, alias, politique Preview Protection, pare-feu, logs/drains et règles réseau.
- Offre, région/fonctions, limites de corps/durée, contraintes de sorties réseau et coûts.
- Autorisations GitHub App, déploiements automatiques et commandes de build/install.

Ces réglages ne sont pas déductibles de l'absence de vercel.json. La documentation prévoit des déploiements automatiques sur push ; aucune conclusion propre au projet n'est possible sans console. **Ne pas pousser pour vérifier.** [Git et Vercel](https://vercel.com/docs/git).

Les workflows GitHub du dépôt déclenchent des tests/Strix sur main, PR vers main ou lancement manuel ; cela ne démontre ni n'annule un automatisme Vercel indépendant.

### V2 — Préparer un projet et une origine dédiés [B, création/configuration C-VERCEL]

Proposition : projet de qualification séparé et véritable cible **Preview**, sans rattachement aux domaines de production. Ne pas réutiliser les variables Production ni les intégrations qui choisissent la base de production.

Choisir une origine HTTPS stable, noter son propriétaire et le besoin DNS éventuel. Aucun nom effectif ni URL à renseigner n'est fourni : garder le champ « à valider ». Le gateway construit liens et retours avec APP_URL, pas avec un alias supposé stable.

Attention : « Import project »/« Deploy » peut déclencher immédiatement un premier déploiement. Ne pas utiliser ce chemin pour une simple préparation. Si la création d'un projet ne peut se faire sans déploiement, conserver la fiche de configuration sans le créer jusqu'à autorisation séparée.

Il n'existe pas de garantie « projet séparé = Preview » : choisir réellement la cible Preview et contrôler le domaine/environnement, ne jamais utiliser --prod ni Promote to Production. [Environnements Vercel](https://vercel.com/docs/deployments/environments).

### V3 — Variables et build [A pour la fiche, B+C-SECRETS pour toute saisie distante]

Préparer uniquement la portée Preview du projet dédié et, si disponible, l'override de branche qualification/shop-lot-7. Contrôler aussi les variables partagées de la team/Marketplace : elles peuvent fournir une mauvaise DATABASE_URL ou paire Redis.

Commandes du projet : installation depuis package-lock.json, build npm run build ; postbuild génère le sitemap. **Aucune migration ni seed dans Install/Build/Postbuild.** Aucune branche de production ou workflow n'est modifié.

Le build vérifié du 7A utilise Node 24.14.1 ; CI vise Node 22. Choisir la version cible supportée et la rejouer avant déploiement, sans prétendre à une nouvelle réussite CI. Ne pas forcer NODE_ENV=development sur Preview pour contourner HTTPS/Redis. VERCEL et VERCEL_ENV doivent provenir de la vraie plateforme, pas de valeurs simulées.

Après toute future saisie de variables, un nouveau build peut être nécessaire ; cela reste une opération de déploiement distincte. Aucun push/CLI vercel/import/déploiement effectué ici.

### V4 — Accès testeurs, webhooks, réseau et IP [B ; toute modification C]

Les pages et API client/admin restent privées par les mécanismes existants. La protection de plateforme ajoute une barrière pour limiter les testeurs ; elle ne remplace pas rôle/MFA.

Pour le webhook :
1. Vérifier les mécanismes réellement disponibles dans l'offre et leurs portées.
2. Ne pas désactiver toute la protection Preview pour rendre le webhook accessible.
3. Ne pas ajouter un secret de bypass dans une query URL, un rapport ou des arguments visibles. Le mécanisme par en-tête doit être gardé privé ; ne pas supposer que Stripe injectera cet en-tête.
4. Si aucun accès ciblé compatible n'est possible, marquer l'endpoint **bloqué**. Choisir après accord un listener local pour un périmètre partiel ou concevoir un relais dédié conservant le corps/signature et injectant le secret privé. Ce relais serait une ressource/configuration supplémentaire, non créée et non présumée approuvée.
5. La création d'un endpoint Dashboard avant résolution de ce point ne vaut pas préparation réussie.

Référence : [protection pour automatisation Vercel](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation). Ne pas confondre signature Stripe, cookie de plateforme, bypass de plateforme et secret de session.

L'authentification production et le contact utilisent les en-têtes IP de confiance Vercel. Ne pas simuler VERCEL=1 hors plateforme ; un proxy supplémentaire peut changer l'IP perçue. Prévoir le contrôle futur de deux clients et des en-têtes forgés selon [les en-têtes Vercel](https://vercel.com/docs/headers/request-headers). Aucune allowlist IP Stripe/Vercel universelle n'est supposée.

next.config.js redirige x-forwarded-proto=http vers www.nomad403.com même sur une autre origine. Préparer un préflight sans cookie, sans mail et sans suivi automatique des redirections : toute Location vers production impose arrêt. Une correction éventuelle est une tâche distincte, pas une désactivation implicite des protections.

### V5 — Redis : dépendance obligatoire de la Preview [B+C-REDIS]

Choisir une instance Upstash exclusivement qualification et une paire REST HTTPS complète. Les préfixes utilisent VERCEL_ENV ou NODE_ENV, pas le nom du projet/de la branche : plusieurs previews partageant Redis peuvent partager les limites.

Préparer les permissions EVAL/GET/INCR/EXPIRE/TTL et celles requises par le contact. L'environnement Preview ne doit pas retomber sur la mémoire de développement. REDIS_TEST_PORT cible le test Redis TCP local, pas Upstash. Aucune instance, intégration automatique, connexion ou commande Redis effectuée ici.

## 5. Variables à préparer, sans leurs valeurs

Les huit noms STRIPE_PRICE_* sont détaillés en S2. Aucun Price ID réel n'est encore disponible.

| Variables lues par le code | Source / portée prévue | Condition avant utilisation |
|---|---|---|
| DATABASE_URL | Coffre applicatif → Preview serveur | Base de qualification et rôle applicatif attestés ; candidat poolé vérifié |
| DATABASE_SSL | Preview et futur migrateur | require pour Neon ; disable interdit |
| AUTH_SECRET | Nouveau secret privé → Preview serveur | Aléatoire, indépendant, au moins 32 caractères |
| AUTH_MFA_KEY | Nouvelle clé privée → Preview serveur | 32 octets base64, indépendante ; nécessaire au MFA |
| APP_URL | Origine approuvée → Preview serveur | HTTPS exacte, stable, hors domaines de production |
| ADMIN_EMAILS | Boîtes administrateur de test | Ne contient aucun client réel ; pas une allowlist générale |
| STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY | Même sandbox → serveur | sk_test_ / pk_test_ seulement ; aucune clé live |
| STRIPE_WEBHOOK_SECRET | Endpoint ou listener sélectionné → serveur | whsec_ propre à cette destination |
| STRIPE_PRICE_* (8) | Fiches Price du sandbox → serveur | Toutes les lignes de S2 vérifiées |
| STRIPE_ALLOW_LIVE | Environnement effectif et héritages | Absent ou false ; jamais true |
| RESEND_API_KEY / RESEND_FROM | Clé d'envoi et expéditeur test → serveur | Permission limitée, domaine vérifié, protection et plafond approuvés |
| RESEND_TO | Contact seulement → serveur | Boîte contrôlée, pas d'envoi sans accord |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | Redis qualification → serveur | Paire HTTPS complète, instance distincte |
| KV_REST_API_URL / KV_REST_API_TOKEN | Alias éventuels | Ne pas mélanger paires ni hériter d'alias production |
| NODE_ENV / VERCEL / VERCEL_ENV | Fournis par runtime/plateforme | Pas de falsification pour contourner les contrôles |
| STRIX_LLM / LLM_API_KEY / LLM_API_BASE | Audit séparé, pas Preview applicative | À préparer seulement si audit autorisé, fournisseur/budget/scope validés |
| REDIS_TEST_PORT | Banc local seulement | Ne prépare pas les limites Preview |

Aucun NEXT_PUBLIC_* nécessaire pour ces secrets ; la clé publique Stripe elle-même est lue côté serveur dans l'architecture existante. Ne pas inventer STRIPE_PORTAL_CONFIGURATION_ID, DATABASE_POOL_URL ou une autre variable non lue en espérant changer le comportement.

### Génération et stockage des secrets indépendants [B, réalisation après accord]

Choisir d'abord le coffre/l'emplacement privé et vérifier ses accès. Générer AUTH_SECRET avec au moins 32 octets aléatoires (puis encoder) et AUTH_MFA_KEY avec 32 octets encodés en base64, directement vers ce stockage, **sans console.log ni sortie PowerShell**. Les deux valeurs doivent être distinctes entre elles et de production. Le propriétaire peut attester la distinction sans transmettre les valeurs de production.

Les clés fournisseur sont créées dans leurs consoles dédiées puis copiées directement dans le coffre. Ne pas extraire les secrets production pour les comparer dans ce clone. Pas de secret dans argument CLI, historique, capture, chat, URL de bypass ou Git. Vérifier les ACL avant création d'un fichier local ; .gitignore ne chiffre ni ne protège le fichier.

.env.qualification.local est seulement un nom proposé, ignoré par Git ; aucun fichier n'a été créé. Next ne charge pas automatiquement ce nom personnalisé. Pour une future exécution locale, choisir un lanceur qui charge explicitement ce coffre/fichier et exclut les anciennes variables héritées. Node --env-file ne remplace pas les valeurs déjà présentes dans le processus.

## 6. Vérifications de sécurité et preuve de cible test

### 6.1 Manifeste à remplir par le propriétaire [B]

Conserver les valeurs privées dans le coffre ; la preuve expurgée contient seulement IDs non secrets, aliases et résultats de comparaison.

| Élément | Preuve à obtenir | État actuel |
|---|---|---|
| Code | SHA exact, branche et digests migrations | Référence locale vérifiée ; aucune publication |
| Neon | Project/branch/compute/database/role et attestation vide/hors production | Non fourni |
| Connexions | Références de coffre directe/migrateur et applicative/poolée, même cible | Non fournies |
| Stripe | Compte/sandbox, version API, clés test attestées | Non fournis |
| Prix | Les huit price IDs et attributs vérifiés, product IDs correspondants | Non fournis |
| Webhook | Endpoint/listener, URL approuvée, version API, portée du secret et accès plateforme | Non fourni |
| Portal | Configuration par défaut test et options autorisées | Non vérifié |
| Resend | Compte/domaine vérifié, permission, expéditeur, boîtes contrôlées, plafond | Non fournis |
| Vercel | Team/project, cible Preview, URL, scopes de variables, automatisation Git, protections | Non fournis |
| Redis | Instance test et scope, permissions REST, sans ressource production partagée | Non fourni |
| Secrets | Références de coffre, date/responsable, indépendance attestée | Non préparés |
| Autorisations | Identifiants des accords et opérations couvertes | À obtenir |

Une étiquette « test », une URL Neon ou un préfixe price_ ne constituent pas une preuve d'isolation.

### 6.2 Préflight local sans réseau [A]

Vérifier les champs présents et les formats en mémoire ; ne retourner que booléens/statuts, jamais les valeurs. Comparer la cible effective à une **allowlist positive issue du manifeste approuvé**, pas seulement à une liste de domaines production interdits.

Le contrôle doit refuser : champ inconnu/non fourni, DATABASE_SSL désactivé, APP_URL hors origine approuvée, secret auth trop court, MFA non 32 octets, clé Stripe non test, STRIPE_ALLOW_LIVE=true, paire Redis incohérente, Price IDs manquants ou héritage non maîtrisé.

Ce contrôle est une procédure proposée, pas un garde-fou logiciel déjà implémenté. Le code actuel ne bloque pas automatiquement DATABASE_URL production et ne vérifie pas tous les attributs du Price. Sans provenance attestée, ne pas connecter le service.

### 6.3 Lectures de preuve distantes — seulement après cible et accord

Avant une migration future, effectuer une vérification en lecture seule, autorisée et bornée :
- Relier les métadonnées Neon de la console à l'endpoint exact du secret, à la base et au rôle. En connexion directe, contrôler identité attendue et TLS (y compris état de la connexion, pas seulement sslmode dans une URL).
- Une requête paramétrée peut comparer current_database() et current_user aux valeurs approuvées et ne rendre que « correspond/ne correspond pas ». Conserver les détails uniquement dans la preuve privée.
- Relever les huit objets Price en lecture et vérifier les attributs S2, avec les clés du sandbox attendu ; ne pas appeler Checkout pour cette preuve.
- Relever domaine/statut/permission Resend dans la console sans bouton d'envoi ; consulter noms/scopes Vercel sans exporter leurs secrets.
- Vérifier que les comptes de test ne sont pas ceux des clients réels.

Ces vérifications n'ont pas été effectuées ici faute d'accès/cibles et ne doivent pas être annoncées réussies. Elles ne valident ni paiement, ni réception email, ni schéma après migration.

Pour chaque opération autorisée ensuite : ID campagne, acteur, SHA, cible attendue, comparaison vraie, nature lecture/écriture, accord correspondant, date UTC et résultat. Ne pas inclure de corps de webhook, signature ou secret. Arrêt avant l'action si une cible change ou si une vérification est inconnue.

### 6.4 Arrêts et limites conservées

Arrêt immédiat si domaine production, vraie base/client/carte, livemode=true, redirection vers production, fuite de secret, dépassement de budget ou désaccord du manifeste. Ne pas « réparer » en supprimant les reçus/idempotences ou en désactivant MFA/Redis.

Les risques de mapping invoice.payments, date de remboursement, métadonnées historiques absentes et données de quotas restent ceux de 7A. Les test clocks Stripe n'avancent pas l'heure serveur : les scénarios temporels accélérés devront rester bloqués ou faire l'objet d'un banc explicitement autorisé. Strix n'est pas exécuté ; son scope actuel interdit les services réels. Aucun correctif applicatif nouveau n'est inclus dans 7B.1.

## 7. Critères autorisant le passage à 7B.2

Le guide terminé n'autorise pas une exécution. **État actuel : NO-GO de démarrage automatique 7B.2, prérequis distants non attestés.**

### Autorisation d'entrée contrôlée

Le propriétaire doit :
- Compléter et approuver le manifeste, les boîtes/acteurs, budgets et plafond d'e-mails, et les périmètres de test.
- Fournir les preuves de ressources exclusivement test et le stockage indépendant des secrets, sans divulguer leurs valeurs.
- Valider les huit correspondances Price, le Portal par défaut, le statut du domaine Resend et le Redis dédié.
- Choisir le projet/cible Preview, l'origine stable et la stratégie de réception webhook/protection ; connaître les déploiements automatiques sans les déclencher.
- Approuver séparément les premières opérations de 7B.2 : lectures de préflight, migration, premier déploiement de test, puis seulement envoi et paiements simulés si retenus.

La base peut encore être sans schéma et la Preview non déployée à cette entrée : c'est intentionnel. On autorise d'abord une séquence bornée, pas un GO fonctionnel. L'endpoint hébergé ne peut être déclaré opérationnel qu'après le déploiement autorisé et ses contrôles d'accès.

Le risque de mapping Stripe bloque la réussite des encaissements tant que le premier payload réel n'est pas vérifié ; il n'oblige pas à prétendre avoir payé avant même d'autoriser ce test. De même, horloge/Strix/concurrence peuvent limiter des scénarios ultérieurs, sans être faussement annoncés qualifiés.

### Accords précis encore nécessaires [C]

| Accord | Action visée | Validation demandée |
|---|---|---|
| C-N | Projet/base/rôles Neon, éventuel snapshot test | Cible, offre, droits, coût ; aucune donnée production |
| C-STRIPE | Produits/prix/Portal et réglages de facturation du sandbox | Compte/sandbox, huit tarifs, version et portée des options |
| C-RESEND | Domaine/DNS et clé d'envoi test | Périmètre DNS, expéditeur, permission et destinataires |
| C-REDIS | Instance REST/integration dédiée | Instance, droits, coût et isolation |
| C-SECRETS | Génération locale et toute saisie/modification distante de secrets | Coffre, ACL, scopes Preview ; rien en production |
| C-VERCEL | Projet/configuration Preview, protections et éventuel DNS | Projet, URL, automatismes, protections ; **ne couvre pas un déploiement** |
| C-OUTILS | Installation CLI ou banc supplémentaire | Outils/versions, poste/environnement ; aucun service implicite |
| C-LECTURE | Préflight réel avec les identifiants de test | Services/objets ciblés, lecture seule ; aucune mutation métier |
| C-WEBHOOK | Endpoint/listener ou relais explicitement choisi | Destination, secret et accès ; pas de test de paiement implicite |
| C-MIGRATION | 0001→0005 et essai d'upgrade ultérieur | Base attestée, snapshot, lancement unique et retour arrière |
| C-DEPLOY | Premier déploiement exclusivement test | SHA exact, cible Preview, URL et variables ; aucun push/production |
| C-ENVOI | Premier lien magique et délivrabilité | Boîtes contrôlées et nombre maximal d'envois ; aucune campagne |
| C-PAIEMENT | Paiements/refus/renouvellements/résiliations/refunds simulés | Sandbox, scénario et plafond ; jamais Stripe Live |
| C-CONC | Concurrence, panne et replay | Connexions/cibles/durée/débit/restauration |
| C-AUDIT/C-CODE | Strix payant/scope distant ou correction technique éventuelle | Scope/modèle/budget ou tâche de code avec revue distincte |

Aucun de ces accords n'est demandé pour une action déjà réalisée : ils définissent la suite à autoriser. B+C reste requis lorsque l'opérateur doit utiliser sa console propriétaire.

## État de livraison

Guide seulement, sur qualification/shop-lot-7. Les vérifications exécutées dans cette phase sont lectures locales, contrôle de présence sans valeurs et revue de documentation officielle. Les 143 tests réussis, le test Redis ignoré, TypeScript/build et audit npm à zéro vulnérabilité rapportés dans 7A sont les résultats de la phase précédente : **ils n'ont pas été relancés pour ce changement documentaire**.

Les 61 scénarios externes restent non exécutés. Aucun secret ni Price ID réel n'est affiché ou inventé ; aucune ressource/configuration distante n'est attestée prête. Pas de commit, push, fusion, migration, e-mail, paiement, déploiement ou passage à 7B.2.

## Contrôles de livraison exécutés

- Lecture intégrale de LOT7A-READINESS.md ; empreinte SHA-256 du rapport de référence : c4f2f4034c92b935c81a83f2490bd192e3dd276763a428a404fc7bb4b5b6e627.
- Huit lignes tarifaires du présent guide comparées automatiquement à lib/shop/plans.ts et aux noms réellement lus dans lib/billing/stripe-env.ts : cohérentes. **Aucun Price ID distant vérifié.**
- Inventaire local de présence sans valeurs : aucune variable de service ni fichier .env non example ; configuration distante non inspectée.
- 264 fichiers indexés et les deux documents non commités examinés : aucune signature de clé privée/token/clé Stripe/Resend/URL de connexion avec identifiants détectée. Ce scan n'est pas une certification de sécurité.
- .env.local, .env.qualification.local, .env.production et .vercel/project.json confirmés ignorés par Git.
- git diff --check réussi ; aucun fichier suivi modifié ni fichier indexé pendant cette phase. Branches main/Lots 4–6/recovery et HEAD préservés.
- Original et sauvegarde : 470 vérifications d'empreintes réussies sur les 235 fichiers de chaque dossier, sans modification.
- Seul fichier ajouté par 7B.1 : docs/LOT7B1-CONFIGURATION.md, laissé non commité. docs/LOT7A-READINESS.md était déjà non commité et demeure inchangé.
- La suite automatisée complète, TypeScript, build, npm audit et Strix ne sont pas réexécutés pour ce guide documentaire. Aucun ancien résultat n'est présenté comme un nouveau test.

**Préparation documentaire terminée. Ressources externes et huit Price IDs non attestés ; NO-GO fonctionnel maintenu. Passage à 7B.2 soumis aux preuves et accords explicites ci-dessus.**
