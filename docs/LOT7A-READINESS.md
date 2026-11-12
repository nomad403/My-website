# LOT 7A — READINESS : préparation à la qualification externe

Date : 11 novembre 2026 (Europe/Paris). Projet Nomad403 Shop, clone My-website-recovery.

**Statut : préparation documentaire réalisée ; qualification fonctionnelle externe NO-GO. Aucun Lot 7B exécuté.** Ce rapport est un plan à approuver, pas une attestation de fonctionnement des services.

## 1. Référence Git et périmètre

Référence vérifiée avant modification : branche feature/shop-lot-6-admin, commit 1e5f3b5e0b85064633f9e319d69380f5a773f0ca. Working tree initial propre. Branche créée : qualification/shop-lot-7, depuis ce commit exact. Remote configuré : https://github.com/nomad403/My-website.git. Aucun fetch/push, déploiement ou modification distante demandé ou exécuté ; la tête distante n'a pas été revérifiée.

Références locales à préserver :
- main : 26e5de2aac1a20be225411d18a86b3a05897f883.
- Lot 6 : 1e5f3b5e0b85064633f9e319d69380f5a773f0ca.
- Lot 5 : e1cd46fbb063a5167a528abe34b7c6334096e337.
- Lot 4 : b0ef9ecc57181ee96ae1cdd07422390adaf39144.
- recovery/shop-lots-1-2-3 : d113d986d2830af246d2ae97af998efc4be4c273.

Aucune modification applicative, migration nouvelle ou dépendance ajoutée. Le seul livrable source prévu est ce document. Le build régénère les sitemaps ; leurs URL/contenus seront comparés avant retrait des différences de génération. Original et sauvegarde ne sont pas modifiés.

## 2. Inventaire réel des dépendances

| Dépendance | Usage / code examiné | Constat local | Prérequis avant 7B |
|---|---|---|---|
| Neon / PostgreSQL | lib/db/client.ts, schema.ts, scripts/db-migrate.mjs | Aucune connexion configurée ; production inconnue et interdite | Projet/base dédiée vide, identité et rôle confirmés, TLS, sauvegarde/retour arrière |
| Drizzle / postgres.js | Migrations SQL versionnées et schema_migrations | 0001 à 0005, aucune autre migration SQL | Ordre/digests vérifiés, un seul migrateur, connexion directe dédiée |
| Resend | lib/auth/runtime.ts, contact | Aucune configuration locale | Clé d'envoi indépendante, expéditeur vérifié et boîtes de test contrôlées |
| Authentification | magic links, sessions PostgreSQL et cookies signés | Implémentation locale testée, pas de réception réelle | AUTH_SECRET et AUTH_MFA_KEY propres aux tests, origine stable |
| MFA | Chiffrement TOTP, codes de récupération | Testé en mémoire/PGlite seulement | Admin de test, authentificateur et stockage privé des codes |
| Stripe | stripe-env.ts, gateway, webhook, billing-event.ts | Aucune clé ni aucun Price ID local | Sandbox/mode test identifié, huit prix EUR, secret webhook dédié, Portal |
| Upstash Redis REST | auth/rate-limit.ts, contact/contact-abuse.ts | URL/token absents | Instance dédiée, token avec EVAL/écriture/TTL, test multi-instance |
| Vercel | en-têtes de confiance, runtime et Git integration | Aucun .vercel ni vercel.json local trouvé ; réglages distants non inspectés | Décision d'hébergement de qualification et isolation des variables/ressources |
| Strix | scripts/strix.mjs, workflows et scope | Doctor en échec ; archive d'ancien audit présente | Outils, fournisseur et budget autorisés, périmètre approuvé |
| Registre npm | audit des dépendances verrouillées | Audit exécuté, résultat dans section contrôles | Réauditer après toute évolution du lockfile |

Versions locales : Node v24.14.1, npm 11.21.1 ; workflow CI configuré sur Node 22. La réussite locale n'est pas une nouvelle exécution CI Node 22.

Disponibles : Node et npm. Non trouvés dans PATH : Stripe CLI, GitHub CLI, Vercel CLI, Docker, psql et redis-server. L'absence de CLI n'établit pas l'absence de comptes/services distants.

Le scan de présence a examiné l'environnement du processus et les fichiers .env* non examples du clone : **aucun fichier de ce type et aucune des variables de service inventoriées renseignée**. Cela ne décrit ni les secrets du poste hors clone, ni GitHub Actions, ni Vercel. Aucune valeur n'a été affichée ou copiée.

## 3. Variables nécessaires — noms et exigences uniquement

Toutes sont actuellement absentes du processus inspecté, sauf les fichiers examples contenant des modèles vides. Aucune valeur proposée ci-dessous ne constitue une configuration appliquée.

| Nom exact | Exigence / portée |
|---|---|
| DATABASE_URL | Connexion privée vers la base de qualification attestée ; jamais production |
| DATABASE_SSL | TLS requis : require ; disable interdit pour Neon |
| AUTH_SECRET | Secret aléatoire indépendant, minimum 32 caractères, serveur seulement |
| AUTH_MFA_KEY | Clé indépendante de 32 octets encodés en base64, serveur seulement |
| APP_URL | Origine exacte de test, stable ; HTTPS obligatoire en NODE_ENV=production |
| ADMIN_EMAILS | Seulement les adresses contrôlées des administrateurs de qualification |
| RESEND_API_KEY | Clé d'envoi de qualification, permissions minimales et domaine isolé si possible |
| RESEND_FROM | Expéditeur autorisé du domaine/sous-domaine de test |
| RESEND_TO | Boîte de test contrôlée, seulement si le formulaire contact est inclus |
| UPSTASH_REDIS_REST_URL | Endpoint HTTPS d'un Redis exclusivement qualification |
| UPSTASH_REDIS_REST_TOKEN | Token privé permettant les opérations des limiteurs |
| KV_REST_API_URL / KV_REST_API_TOKEN | Alias acceptés ; privilégier une seule paire complète, sans mélange implicite |
| STRIPE_SECRET_KEY | Exclusivement préfixe sk_test_ et compte/sandbox vérifié |
| STRIPE_PUBLISHABLE_KEY | Exclusivement pk_test_, même compte/sandbox ; pas de variable NEXT_PUBLIC requise |
| STRIPE_WEBHOOK_SECRET | Signature whsec_ propre au listener ou endpoint retenu, jamais réutilisée de production |
| STRIPE_ALLOW_LIVE | Doit rester absent/vide ou false, jamais true ; vérifier aussi les variables héritées |
| STRIPE_PRICE_ESSENTIAL_MONTHLY | Prix test récurrent EUR, 1900 centimes / mois |
| STRIPE_PRICE_ESSENTIAL_YEARLY | Prix test récurrent EUR, 19000 centimes / an |
| STRIPE_PRICE_PLUS_MONTHLY | Prix test récurrent EUR, 4900 centimes / mois |
| STRIPE_PRICE_PLUS_YEARLY | Prix test récurrent EUR, 49000 centimes / an |
| STRIPE_PRICE_PREMIUM_MONTHLY | Prix test récurrent EUR, 6900 centimes / mois |
| STRIPE_PRICE_PREMIUM_YEARLY | Prix test récurrent EUR, 69000 centimes / an |
| STRIPE_PRICE_FRIEND_HOST_MONTHLY | Prix privé test EUR, 1000 centimes / mois |
| STRIPE_PRICE_FRIEND_CARE_MONTHLY | Prix privé test EUR, 2000 centimes / mois |
| NODE_ENV | Choisi par le lanceur ; les contrôles production exigent HTTPS et Redis |
| VERCEL / VERCEL_ENV | Variables fournies par la vraie plateforme ; ne jamais les simuler pour contourner l'identité IP |
| REDIS_TEST_PORT | Facultatif, port d'un Redis local pour le test Lua existant ; ne configure pas Upstash |
| STRIX_LLM / LLM_API_KEY | Modèle et secret du fournisseur d'audit, séparés des secrets applicatifs |
| LLM_API_BASE | Facultatif, endpoint fournisseur autorisé ; ne pas supposer nécessaire |

Un préfixe price_ ne prouve pas le mode test : contrôler livemode=false, récurrence, devise et montant dans le bon sandbox avant tout Checkout. Le code vérifie la forme des clés/prix et leurs montants, pas l'isolation de la base ni l'indépendance des secrets.

Utiliser un coffre local ou un fichier ignoré dont les ACL limitent l'accès au propriétaire. Jamais de clé dans arguments CLI, captures, historique PowerShell, rapport ou conversation. Pas de NEXT_PUBLIC pour les secrets. Générer les clés directement vers leur stockage privé, sans les imprimer. Aucun fichier contenant des valeurs n'a été créé ici.

## 4. Topologie proposée et décisions encore manquantes

Aucun nom de projet, URL, compte, région, base, clé ou budget n'a été inventé. Le manifeste privé de 7B devra lier : identifiant de campagne, SHA exact, URL de test, projet/branche/base/rôle Neon, sandbox Stripe, identifiant Redis, expéditeur Resend et boîtes contrôlées, endpoint webhook et version API. Les identifiants non secrets sont des preuves ; les chaînes de connexion restent privées.

Topologie préférée pour une qualification complète : application de test sur une **véritable Preview Vercel isolée**, Neon dédié vide, Redis dédié, sandbox Stripe, expéditeur/clé Resend indépendants. C'est une proposition nécessitant une autorisation distincte de déploiement de test ; **aucun déploiement n'est autorisé ou réalisé en 7A**.

Alternative partielle sans déploiement : serveur local en développement, base/Redis dédiés et Stripe CLI. Elle permet certains parcours fonctionnels, mais ne qualifie ni cookies Secure/HTTPS production, ni IP de confiance Vercel, ni l'abus du formulaire contact. En production hors Vercel, requestMagicLink/verifyMagicLink reçoivent une IP non fiable/null et échouent fermés. Ne pas définir VERCEL=1 ou accepter un en-tête client arbitraire pour « faire passer » ces tests.

next.config.js redirige x-forwarded-proto=http vers www.nomad403.com, même sur une autre origine. Risque de sortie vers la production avec un proxy/tunnel mal configuré : tester les redirections à blanc avant toute session ; arrêter si Location quitte l'origine de qualification. Une correction future demanderait une tâche autorisée distincte ; ne pas désactiver les contrôles.

Le provisionnement Preview doit exclure les variables de Production et les intégrations qui injecteraient une base de production. Les déploiements automatiques Git/Vercel ne sont pas vérifiés depuis ce clone : aucun push ne doit servir de moyen implicite de provisionnement. Vérifier le comportement des intégrations avant toute future publication. Voir les [environnements Vercel](https://vercel.com/docs/deployments/environments).

## 5. Procédure Neon et plan des migrations — à exécuter uniquement après accord

1. Faire approuver le manifeste de cible et le coût éventuel. Préférer un projet Neon distinct avec une base **vide**, sans import de données réelles. Une branche ordinaire peut copier les données du parent : ne pas dériver la base de qualification d'une branche de production avec ses clients. Voir [gestion des branches Neon](https://neon.com/docs/manage/branches).
2. Confirmer dans la console l'identité projet/branche/base/rôle, puis leur concordance avec le secret stocké. Une URL finissant par un domaine Neon ne suffit pas. L'attestation « hors production » est un verrou préalable : doute = arrêt avant connexion.
3. Préparer un rôle migrateur et un rôle applicatif limités à cette base. Le rôle applicatif doit pouvoir exécuter les transactions et les triggers prévus, sans accès aux autres bases. Vérifier les droits sur les séquences et tables ; ne pas inventer une politique de grants non testée.
4. Choisir une connexion **directe** pour les migrations ; valider le mode poolé à part pour le runtime. Le driver existant désactive les prepared statements et utilise max:1 par processus. Voir [pooling Neon](https://neon.com/docs/connect/connection-pooling).
5. Prévoir sauvegarde/snapshot de la cible de test avant un essai d'upgrade ; aucun dump de production. Lire hors logs les métadonnées de connexion après autorisation et confirmer que les tables métier sont initialement vides.
6. Appliquer les cinq fichiers dans l'ordre ci-dessous avec **un seul migrateur**. Le script ne protège pas deux lancements concurrents et n'enregistre pas de checksum : comparer les SHA avant la campagne.
7. Contrôler schema_migrations, les contraintes, fonctions/triggers, les cinq plans, les colonnes et la ligne billing_sync_lock(id=1). Les cinq entrées doivent être présentes. Un second lancement doit ne rien appliquer et ne pas dupliquer les seeds.
8. Faire séparément un upgrade de schéma Lot 5 avec données **synthétiques** dans une deuxième cible autorisée. Vérifier les prix/temps historiques, dates nulles et absence d'historique inventé.
9. En cas d'échec : arrêter, inspecter le journal expurgé et les migrations enregistrées. Chaque fichier est transactionnel, pas l'ensemble des cinq fichiers. Repartir d'une base de test vierge autorisée ou restaurer son snapshot ; aucune suppression/reset automatique, aucune migration inverse improvisée.

| Ordre | Fichier effectivement présent | Contrôles principaux |
|---|---|---|
| 1 | 0001_foundations.sql | Comptes, sessions/MFA, projets, plans, contrats et facturation de base |
| 2 | 0002_stripe.sql | Checkouts, événements, règles d'idempotence/fraîcheur et réservations |
| 3 | 0003_promotion_admin.sql | Administration/immutabilité des codes et snapshots de conditions |
| 4 | 0004_client_interventions.sql | Demandes, événements, périodes, temps immutable, outbox, ancrages/service |
| 5 | 0005_admin_pilotage.sql | Priorité interne, historique append-only, total de facture, date remboursement et verrou global |

SHA-256 des octets actuels, à conserver/revérifier avant tout transfert :
- 0001 : 1338512e678afec2944dcf65d3b76f0a54da2addca36016347aa950c8d5996ce
- 0002 : ca90967dd787f65630a94007ca15dd14ea67979a5ffc9c49407112acc40d5c83
- 0003 : 1eee2c53a364719b88fc7fb4e24c6371d8e55555205d4ca48e2eadce37ced0cf
- 0004 : 24656e5eef5fe0af9d1ab5bc39ee1ac56d2f4e27c75ee367a1622cde108633ef
- 0005 : 6a77e5e1b49c9ba86a6886a0b3af8a58d98d70f5e76c53824de58d5f83b4a5d2

**Commande préparée, NON EXÉCUTÉE**, depuis le clone, après validation de la cible et stockage des secrets dans un fichier ignoré à l'emplacement explicitement choisi :

```powershell
node --env-file=.env.qualification.local --experimental-strip-types scripts/db-migrate.mjs
```

Le nom .env.qualification.local est une proposition de fichier privé, pas un fichier créé. Le script npm db:migrate ne charge pas .env.local automatiquement ; son DATABASE_URL vient du processus. Node --env-file laisse les variables déjà héritées du processus prioritaires : utiliser une session propre et vérifier la cible effective, sans afficher son URL, avant exécution. Pour l'application Next, importer explicitement les mêmes valeurs approuvées dans un processus propre ou son environnement de test ; Next ne charge pas automatiquement ce nom de fichier personnalisé.

## 6. Procédure Resend et identité — après accord

1. Choisir les comptes/boîtes contrôlés et l'expéditeur de qualification. Réserver admin-Q, client-A, client-B, client-C-concurrence et client-N-sans-abonnement ; noter leurs adresses dans le manifeste privé, pas de vraie adresse client.
2. Faire autoriser le domaine/sous-domaine d'envoi et les changements DNS éventuels. Créer une clé indépendante avec permission d'envoi limitée et domaine restreint si disponible ; ne pas réutiliser la clé production. Voir les [permissions des clés Resend](https://resend.com/docs/api-reference/api-keys/create-api-key).
3. Vérifier l'expéditeur et les restrictions de destinataires du compte. Les adresses de simulation Resend permettent de tester des événements, **pas de récupérer un magic link dans une boîte contrôlée**. Il faut une réception réelle pour A01. Les envois tests consomment le quota selon [Resend](https://resend.com/docs/dashboard/emails/send-test-emails).
4. Stocker RESEND_API_KEY/FROM et, seulement si contact inclus, TO. Aucun batch, campagne ou envoi non sollicité. Fixer un nombre maximal d'e-mails de test approuvé et arrêter à l'approche de ce plafond.
5. Générer AUTH_SECRET et AUTH_MFA_KEY indépendants, limiter ADMIN_EMAILS à admin-Q. Les rôles sont attribués au login selon le mécanisme existant ; vérifier les lignes users, sans éditer arbitrairement les rôles.
6. Prévoir TOTP et récupération dans un stockage privé. Ne jamais capturer QR code, seed, code de récupération, cookie ou token magique. Les liens expirent après 15 minutes, glissement session 14 jours, durée absolue 30 jours ; expiration/rejeu doivent être vérifiés réellement ou rester bloqués.
7. Contrôler au préalable les logs d'accès et de proxy : le magic link contient token dans l'URL ; les logs Next en développement, captures HAR, captures de console ou replay de session peuvent l'enregistrer. Configurer/redacter la collecte ou ne pas la conserver ; la politique distante de logs n'est pas vérifiée. Redacter après coup seulement n'empêche pas une fuite pendant l'essai.

L'outbox d'intervention reste sans worker : aucune notification d'intervention n'est opérationnelle et ne doit être ajoutée à la réussite Resend du lien magique.

## 7. Procédure Stripe test et Portal — après accord

1. Faire approuver le compte/sandbox dédié et vérifier son identité avant chaque opération ; **jamais --live**, jamais de vraies données de carte. sk_test_ / pk_test_ uniquement ; STRIPE_ALLOW_LIVE jamais true. Le code permet le live si ce flag vaut true : c'est un garde-fou conditionnel, pas une interdiction absolue indépendante de la configuration.
2. Vérifier/créer après accord les cinq produits et huit Price IDs du tableau des variables. Tous récurrents EUR, livemode=false et montants/périodes exacts. Pas de coupons Stripe improvisés : les codes privés sont ceux du moteur Lot 4. Un mauvais prix doit échouer côté serveur.
3. Vérifier la version API du sandbox, de l'endpoint et celle du SDK installé ; conserver ces versions dans le manifeste. Le mapping paymentFromInvoice lit payment_intent direct/objet et ne déroule pas invoice.payments : la [structure actuelle Invoice](https://docs.stripe.com/api/invoices/object) impose une vérification réelle. Si la facture payée n'alimente pas le paiement attendu, **NO-GO**, pas de succès basé seulement sur la facture.
4. Configurer le Portal **dans le sandbox** : moyens de paiement, consultation factures, résiliation ; changements de formule/prix/périodicité désactivés. Vérifier résiliation programmée versus immédiate et les dates effectives ; ne pas attendre systématiquement canceled dès la demande.
5. Choisir **une** voie webhook pour la campagne : CLI locale ou endpoint test HTTPS. Les secrets respectifs sont distincts et ne doivent pas être confondus. Ne pas doubler les livraisons volontairement hors des scénarios de rejeu.
6. Installer/autoriser Stripe CLI si la voie locale est retenue, authentifier le bon sandbox sans exposer la clé. Commande prévue : `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`, seulement si cette origine/ce port sont ceux approuvés. Stocker le secret du listener en privé. La CLI n'exige pas de créer un endpoint Dashboard pour écouter localement, selon [Stripe listen](https://docs.stripe.com/cli/listen).
7. Pour un endpoint hébergé : enregistrer uniquement l'URL test approuvée /api/stripe/webhook, vérifier son accès depuis Stripe sans désactiver globalement la protection Preview et stocker son secret propre. Choisir les événements ci-dessous.
8. Après accord 7B uniquement, payer via Checkout avec les moyens simulés officiels, par exemple carte succès 4242 4242 4242 4242 et carte refus 4000 0000 0000 0002, date future/CVC fictif. Ne pas transmettre de PAN à un script métier. Les tests ne déplacent pas de fonds dans un [sandbox Stripe](https://docs.stripe.com/testing), mais leur exécution reste interdite pendant 7A.
9. Pour renouvellements, préparer des clients/simulations distincts. Les [test clocks](https://docs.stripe.com/billing/testing) avancent Stripe, **pas** Date.now() du serveur. Le gateway actuel ne crée pas automatiquement de customer avec test_clock. L'attachement d'une fixture Stripe à un client local, les métadonnées userId/plan/interval/montant et le mode de paiement sont à préparer explicitement dans le sandbox autorisé.
10. Une simulation future peut qualifier des webhooks de renouvellement, mais pas prouver le quota/MRR à la même date virtuelle : l'application garde son heure réelle et exclut les périodes futures. Pour E2E temporel complet, choisir attente en temps réel ou instrumentation d'horloge strictement test à concevoir et faire approuver dans une tâche distincte. Ne pas changer l'horloge du poste ou modifier les dates en base pour présenter un test réel réussi.

Événements requis : checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.finalized, invoice.paid, invoice.updated, invoice.payment_failed, refund.created, refund.updated, charge.refunded.

La signature porte sur le corps brut. Le système sérialise les livraisons par billing_sync_lock, annule état/historique/reçus sur retry, et borne le verrou et la relecture Stripe à 5 s. La suppression avant création et le remboursement avant paiement peuvent nécessiter un rejeu ; un reçu stripe_events ne doit exister qu'après succès de l'application.

Procédure de reprise prévue :
- Relever ID/type/date de l'événement et ID objet, statut HTTP, absence/présence du reçu et état avant/après, **sans corps brut, signature ou données de paiement dans le rapport**.
- Corriger uniquement la panne de qualification autorisée, puis renvoyer l'événement authentique via `stripe events resend <event_id>` vers le listener actif, ou avec `--webhook-endpoint=<endpoint_test_id>` vers l'endpoint dédié. Ces placeholders ne sont pas des IDs existants. Vérifier la destination et la fenêtre de rétention supportée ; [commande officielle](https://docs.stripe.com/cli/events/resend).
- Rejouer le même ID deux fois : une seule ligne/écriture monétaire. Pour désordre, suspendre le forwarder de test puis renvoyer les événements authentiques dans l'ordre inverse, sans falsifier created.
- Pour deux événements de même seconde et même statut, capturer deux mises à jour réelles rapprochées des dates de résiliation ; vérifier created égal avant de classer le scénario exécuté. Sinon bloqué/non exécuté, malgré la couverture simulée.
- Pour la panne de réconciliation : sur ces événements à égalité, faire approuver une coupure réseau test ciblée vers l'API Stripe (ou une injection test explicitement conçue), vérifier l'échec sans reçu/écriture, rétablir puis rejouer. Déconnecter toute la base ou enlever toutes les variables ne prouve pas spécifiquement cet échec de relecture.
- La réconciliation existante est celle des égalités ; aucun outil général de réparation de toutes les données anciennes n'existe. Rejouer un événement déjà traité ne complète pas automatiquement ses champs manquants. Ne pas supprimer ses reçus ni ses écritures financières pour forcer le rejeu.

## 8. Redis, hébergement et banc de concurrence

Utiliser une instance Upstash qualification distincte, pas seulement un préfixe dans Redis production. Une seule paire REST complète ; permissions EVAL/GET/INCR/EXPIRE/TTL et opérations contact. Les préfixes actuels utilisent VERCEL_ENV ou NODE_ENV, pas le nom de branche : deux previews partageant Redis peuvent donc partager leurs quotas. Contrôler réponses, compteurs et TTL sans imprimer Authorization. [API REST Upstash](https://upstash.com/docs/redis/features/restapi).

Le test ignoré actuel utilise Redis TCP local sur 127.0.0.1 via REDIS_TEST_PORT. Il ne valide pas Upstash REST. La mémoire de développement ne le remplace pas. Ne pas effacer les compteurs/FLUSHDB pour faire passer les essais ; attendre les fenêtres ou employer des acteurs de test distincts approuvés.

Pour prouver les verrous sur Neon, prévoir deux processus/instances et **deux connexions PostgreSQL indépendantes**, avec sessions réellement authentifiées et Redis de qualification commun. max:1 par processus peut sérialiser un simple Promise.all : ce n'est pas une preuve interconnexions. Aucun banc externe n'est lancé ici.

Strix doctor : sortie 1, binaire, Docker, modèle et clé manquants. L'installateur du dépôt cible Linux/macOS, pas Windows natif ; choisir un environnement compatible autorisé. L'archive .git/strix-reference.zip contient bien le rapport et vulnerabilities.json d'une ancienne référence recovery. Les rapports déjà documentés indiquent security regression 42962258754 réussi et Strix 42962258650 échoué sur CWE-203 promotions, gravité moyenne, corrigée localement au Lot 4. Ils ne certifient pas le Lot 6/7A.

docs/STRIX-SCOPE.md autorise seulement des tests locaux avec services simulés et interdit le site déployé ou les services tiers. Tout audit dynamique d'une Preview demande donc un scope et une autorisation distincts. Strix envoie des sources à un fournisseur IA avec coûts possibles : SHA, modèle, budget et politique de traitement des sources à approuver. Aucun audit payant n'a été lancé.

## 9. Protocole et matrice de qualification

Ordre impératif : G0 approbation manifeste/cibles/budgets → G1 stockage privé des secrets et outils → G2 cible DB vérifiée puis migrations/snapshot → G3 Redis/Resend/prix/Portal/webhook et préflight origine/logs → G4 authentification/MFA → G5 Checkout et synchronisation → G6 concurrence/interventions/finances/sécurité → G7 rapport et clôture autorisée.

**Toutes les lignes ci-dessous ont le statut NE : non exécutée avec les services réels.** PASS exige des preuves, FAIL un résultat incorrect, BLOCKED un prérequis absent. SIM reste une simulation, pas PASS externe.

Fiche de preuve obligatoire : ID, SHA/versions, date UTC, cible, aliases acteurs, état initial, actions, IDs Stripe/locaux, HTTP et données DB avant/après, résultat attendu/observé, capture expurgée, anomalie/gravité. Jamais de PAN, cookie, token magique, clé ou code MFA dans cette fiche ou dans Git.

### Authentification — NE

| ID | Procédure reproductible | Attendu et preuve |
|---|---|---|
| A01 | Client-A demande un lien, reçoit le mail Resend et confirme le formulaire | Réception réelle, compte/session PostgreSQL, token seulement haché ; aucun abonnement activé |
| A02 | Lien distinct inutilisé, attendre plus de 15 min puis confirmer | Expiration refusée, aucune session ; ne pas changer la TTL pour prétendre tester ce chemin |
| A03 | Consommer puis rejouer le lien, aussi simultanément | Une seule consommation, rejeu refusé |
| A04 | Recharger /shop et redémarrer le serveur sans changer les secrets | Session persistée et validée côté base |
| A05 | Se déconnecter puis rejouer le cookie vers les API | Session révoquée, accès refusé |
| A06 | Vérifier glissement 14 j et limite absolue 30 j | Campagne longue ou horloge de test approuvée ; sinon BLOCKED temporel |
| A07 | Admin-Q tente les API sans MFA puis procède à l'enrôlement | Refus avant confirmation, seed chiffré, codes privés non capturés |
| A08 | TOTP faux puis valide, puis nouvelle session magic link | Faux refusé, valide autorisé, nouvelle session sans MFA |
| A09 | Utiliser un code de récupération puis le rejouer en concurrence | Une seule utilisation, code non récupérable dans les réponses |
| A10 | Client-B appelle admin/objets de A ; admin révoqué ou désactivé retente l'accès | Contrôles rôle/session/MFA en base, aucune donnée étrangère |

### Stripe — NE, sandbox uniquement

| ID | Procédure reproductible | Attendu et preuve |
|---|---|---|
| S01 | Essential mensuel, Checkout carte test succès, attendre les webhooks | 1900 EUR centimes/mois, contrat/facture/paiement uniques, /shop et /admin concordants |
| S02 | Compte distinct Essential annuel, succès simulé | 19000 centimes/an ; snapshot exact, pas de confusion avec un paiement mensuel |
| S03 | Code privé Friend Host créé par admin Lot 4, puis Checkout | 1000/mois, réservation consommée une fois, offre absente du catalogue anonyme |
| S04 | Code Friend Care sur autre compte | 2000/mois, conditions conservées et quota seulement après service payé vérifié |
| S05 | Codes inexistant/expiré/désactivé/épuisé/restreint | Erreur publique uniforme, aucune divulgation du tarif privé |
| S06 | Code max=1, deux comptes et deux connexions réservent simultanément | Au plus une réservation/consommation ; double clic/retry sans dépassement |
| S07 | Carte test refusée dans Checkout | Aucun encaissé succeeded ; états réellement reçus, pas de paiement inventé si PaymentIntent absent |
| S08 | Renouvellements mensuel et annuel via simulation approuvée | Nouvelle facture/paiement uniques et dates synchronisées ; réserve d'horloge pour quota/MRR |
| S09 | Échec d'un renouvellement simulé | Événements/solde/statut cohérents, aucun temps inclus sur période impayée |
| S10 | Portal depuis session client, résiliation programmée | Bon customer, retour origine test ; date correcte, pas de canceled prématuré supposé |
| S11 | Résiliation effective/immediate sur autre contrat puis ancien événement | canceled/date conservés selon fraîcheur, droits interrompus, snapshot immuable |
| S12 | Refund partiel puis complément ; événements directs et charge.refunded | Une ligne par refund ID, total exact, encaissement brut non soustrait |
| S13 | Inspecter vraie facture payée et PaymentIntent dans la version API retenue | total/période/contrat et paiement succeeded liés ; sinon FAIL de mapping, pas PASS sur facture seule |
| S14 | Rejouer deux fois le même événement authentique | Un reçu et une écriture monétaire, aucun doublon |
| S15 | Suspendre livraison test, collecter deux états et rejouer récent puis ancien | État récent conservé, dates source distinctes de réception |
| S16 | Deux vrais updated même seconde/même statut, dates de résiliation différentes | created égal prouvé ; relecture et dates finales conformes à Stripe ; sinon BLOCKED |
| S17 | Collecter création/suppression sans livraison ; supprimer avant créer puis rejouer | Premier échec sans reçu, puis état final canceled, pas de résurrection |
| S18 | Panne ciblée API Stripe pendant relecture d'égalité, restaurer et rejouer | Pas d'état/historique/reçu partiel ; reprise correcte |
| S19 | Panne DB/webhook test puis remise en service, dont refund avant payment | Replay des IDs manquants, objets complets sans doublons ; pas de réparation fictive des reçus déjà traités |
| S20 | Falsifier prix/période client et tester un mauvais Price ID de sandbox | Prix imposé côté serveur ou refus ; retour navigateur seul sans activation |

Pour S16, un test à timestamp synthétique n'est pas une preuve externe. Pour S18, enlever toutes les variables ou la DB ne démontre pas spécifiquement une panne de relecture Stripe. Prévoir une panne réseau ciblée ou une injection explicitement approuvée. Pour S19, ne jamais supprimer des reçus pour forcer un rejeu ; aucun outil universel de réconciliation n'existe.

### Interventions — NE

| ID | Procédure reproductible | Attendu et preuve |
|---|---|---|
| I01 | Demande client avec site/objet/description/catégorie/urgence | Historique créé, zéro minute consommée |
| I02 | Client-B tente les IDs de A et projets/contrats croisés | Refus sans texte, note, prix privé ou quota étranger |
| I03 | Admin MFA analyse, confirme mineur/site, accepte puis démarre | Transitions serveur et couverture explicites, client sans pouvoir d'acceptation |
| I04 | Admin choisit priorité, client déclare urgence haute | Pas d'automatisme ; priorité/événement absents des réponses client |
| I05 | Messages des deux acteurs, note interne, pagination | Auteurs/dates/statuts conservés, note jamais visible/notifiée au client |
| I06 | Clôturer 20 minutes puis rejouer la même clé | Une écriture de 20, compteur/statut/audit atomiques |
| I07 | Deux demandes de 40 minutes, clôtures sur deux connexions | Au plus une imputation, autre refusée, aucun dépassement/paiement supplémentaire |
| I08 | Premium puis Care actifs/payés, consommer jusqu'à 60 | Plafond mensuel ancré exact ; Essential/Plus/Host sans quota |
| I09 | Solde inutilisé puis frontière mensuelle réelle ou horloge test approuvée | Nouveau 60 sans cumul, historique conservé ; seule horloge Stripe = BLOCKED |
| I10 | Premium annuel, fin de mois, février et année suivante | Mois ancrés et jour d'origine, jamais 720 ; distinguer SIM/E2E |
| I11 | Service impayé ou fin connue dépassée avec webhook retardé | Refus du débit, temps passé toujours visible, pas de prolongation inventée |
| I12 | Contrat d'un site utilisé ailleurs ; temps futur/ancienne période | Refus transfert et backdating, propriété contrôlée |
| I13 | Demande hors forfait analysée et temps réel enregistré | Aucune minute incluse ni facture/paiement auto ; dépassement traité explicitement à part |

### Finances — NE

| ID | Jeu/actions | Comparaison attendue |
|---|---|---|
| F01 | Essential mensuel 1900 + Premium annuel 69000, actifs payés et périodes actuelles | MRR 7650 centimes, snapshots ; impayés/incomplets/revue exclus |
| F02 | Même jeu puis changement de droits connu | ARR = MRR arrondi ×12 = 91800 ; aucun lien mécanique avec l'encaissement |
| F03 | Factures émises dont crédit client et total différent du montant exigible | Somme total Stripe, taxes/remises/prorata conservés, pas amount_due |
| F04 | Succès, refus, facture non payée | Seulement paiements succeeded à paid_at, brut ; paiement lié manquant signalé |
| F05 | Refund partiel/total et replays S12/S14 | Somme succeeded selon date d'événement de succès connue ; aucun doublon, pas de faux règlement bancaire |
| F06 | Ancienne facture encore ouverte et facture courante payée | Stock remaining actuel, factures émises avant borne de fin, pas seulement le flux mensuel |
| F07 | Bornes UTC, données sans dates/totaux et événements retardés | Début inclus/fin exclue, dates source, diagnostics ; aucune addition de devises |
| F08 | Export privé Stripe test et DB pour mêmes IDs/période/devise | Rapprochement objet par objet ; tout écart expliqué/approuvé ou FAIL |

Règles exactes : [ADMIN-PILOTAGE.md](ADMIN-PILOTAGE.md). Le MRR local a une politique prudente propre : ne pas exiger aveuglément l'égalité avec le Dashboard Stripe. Taxes du snapshot non isolées, stocks actuels et non historiques, aucun indicateur comptable certifié. Un scénario de crédit/prorata non produit reste NE.

### Sécurité — NE

| ID | Procédure | Preuve/garde-fou |
|---|---|---|
| Q01 | API sans session, client, admin sans MFA, IDs étrangers | 401/403/404 sans données sensibles, contrôle serveur indépendamment du middleware |
| Q02 | Magic link existant/inexistant et codes invalides de tous types | Réponses uniformes ; mesures temporelles bornées, sans campagne mail |
| Q03 | Logs applicatifs/proxy, réponses publiques et captures expurgées | Aucun token URL, cookie, QR/seed/code MFA, clé ou URL DB conservé |
| Q04 | Quotas Upstash REST, concurrence, TTL et panne réseau/token | 429 et compteurs cohérents ; aucun envoi après refus/panne, isolation multi-instance |
| Q05 | En-têtes IP/origines forgés puis deux clients Vercel réels | Aucun en-tête arbitraire accepté comme identité ; local seul reste partiel |
| Q06 | Ancien cookie MFA, session révoquée, nouvelle session et signature fausse | Refus effectif même si un ancien cookie indique mfa=1 |
| Q07 | Cross-origin, JSON fragmenté/trop grand, champs rôle/prix/minutes injectés | Refus avant mutation, compteurs et rôles inchangés |
| Q08 | Strix sur SHA exact et scope/budget approuvés | Rapport actuel, aucune source secrète envoyée ; ancien artefact non substituable |
| Q09 | Signature webhook fausse ; config fictive de clés incohérentes ; livemode des objets test | Signature refusée, live jamais activé ; aucune vraie clé live essayée |
| Q10 | Réservations/clôtures/webhooks sur connexions indépendantes et panne contrôlée | Verrous/rollback démontrés sur Neon, pas seulement Promise.all sur max:1 |

## 10. Critères GO/NO-GO et arrêt

GO de préparation 7A = plan livré, contrôles locaux exécutés et résultats exacts, aucun objet externe modifié. Cela n'autorise pas 7B.

Avant accord de départ 7B : manifeste complet hors production, comptes contrôlés, budgets fixés, secrets indépendants/test-only, hébergement/origine/logs/Redis sûrs, migrations/retour arrière/webhook/version API acceptés, stratégie temporelle et concurrence décidées.

GO fonctionnel externe global : tous les scénarios obligatoires exécutés avec preuves, aucune anomalie critique/haute ouverte, rapprochement financier et invariants contractuels démontrés. NE/BLOCKED/FAIL d'une exigence critique maintient NO-GO ; aucune exclusion implicite. Strix manquant reste un audit non exécuté.

Arrêt immédiat si doute production, livemode=true, vraie carte/client réel, secret exposé, redirection vers production, dépassement budget/débit, fuite interclient, double comptage, quota négatif ou migration incohérente. Préserver la preuve privée et signaler ; ne pas réinitialiser/nettoyer pour masquer l'incident.

## 11. Risques et blocages

| Point | Gravité/état | Mesure proposée, non exécutée |
|---|---|---|
| Cibles et secrets absents localement | Bloquant | Ressources dédiées attestées puis accord 7B |
| DATABASE_URL peut techniquement viser production | Bloquant d'exploitation | Contrôle identité/permissions avant connexion ; éventuel garde-fou logiciel distinct |
| Live autorisable par flag true | Bloquant si hérité | Exclure ce flag, contrôler mode et variables héritées |
| Vercel distant inconnu, HTTP redirigé vers production | Élevée | Préflight sans secret, véritable environnement test autorisé ; aucune falsification VERCEL |
| Corps brut du webhook lu sans borne applicative explicite | Risque de disponibilité à qualifier | Vérifier limites d'entrée de l'hébergement et tester les gros corps uniquement dans le périmètre autorisé ; aucun durcissement ajouté en 7A |
| Token magique dans query et logs non vérifiés | Élevée | Politique de collecte/redaction avant premier envoi |
| Mapping payment_intent / invoice.payments | Élevée | Payload réel de la version retenue ; correction ciblée autorisée si échec |
| Métadonnées anciennes manquantes | Blocage droits/finances | Base neuve ; réconciliation authentique pour historique, sans effacer les reçus |
| Horloges Stripe/serveur distinctes | Bloque E2E temporel accéléré | Attente réelle ou instrumentation test explicitement autorisée |
| max:1 et verrou global de 5 s | Limite preuve/débit | Deux connexions, mesure contention/retry/rollback sur Neon |
| Réservation bloquée si événement perdu | Risque opérationnel | Tester expiration/échec/replay, pas de réconciliation générale supposée |
| Redis absent, test Lua ignoré | Blocage anti-abus | Redis local séparé et vrai test Upstash REST |
| Strix absent/scope local simulé | Audit manquant | Environnement compatible, fournisseur/budget/scope approuvés |
| Outbox sans worker | Non opérationnel connu | Ne pas annoncer des notifications d'intervention |
| Node 24 local / Node 22 CI | Écart reproductibilité | Rejouer sur version cible avant validation finale |

## 12. Actions exactes nécessitant une validation supplémentaire

Ces actions sont hors 7A et non exécutées. L'accord 7B devra préciser lesquelles sont autorisées ; il n'autorise pas la production.

| Accord | Action | Informations/effets à approuver |
|---|---|---|
| V0 | Démarrer 7B et la matrice réelle | SHA, cibles, acteurs, calendrier, budgets/coûts/plafonds e-mails/API |
| V1 | Créer/configurer Neon et Redis dédiés | Ressources, région, offre, rôles et coûts ; aucune donnée production |
| V2 | Installer les outils manquants retenus | CLI/versions et environnement local/Linux/Docker compatibles |
| V3 | Générer/stocker secrets et configurer Resend/DNS | Expéditeur/domaine, boîtes contrôlées, clé limitée, plafond d'envois |
| V4 | Créer produits/prix/clients simulés Stripe, codes privés et Portal | Sandbox exact, grille EUR ; aucun objet live |
| V5 | Connecter et migrer la base test 0001→0005, essai d'upgrade | Identité hors production, snapshot et rôle migrateur |
| V6 | Ouvrir listener/endpoint test et faire de vrais appels de service | Origine, API version, secret privé, destination de replay |
| V7 | Magic links et transactions exclusivement simulées, renouvellements/résiliations/refunds | Acteurs et nombre maximal d'opérations ; aucune campagne ni fonds réels |
| V8 | Pannes ciblées, replay et concurrence multi-connexion | Cibles, durée/débit, restauration ; jamais production |
| V9 | Créer/déployer une Preview ou autre hébergement/tunnel isolé | Autorisation distincte de déploiement test, URL/protections/variables ; aucun push implicite |
| V10 | Modifier si nécessaire horloge de test, mapping API ou redirections | Tâche de code distincte avec revue/tests ; aucune modification applicative ici |
| V11 | Lancer Strix et transmettre les sources à un fournisseur IA | SHA, scope local/Preview, modèle, budget et traitement des données |
| V12 | Clôturer/nettoyer/restaurer les seules ressources test, révoquer les accès | Liste exacte des objets/preuves à conserver ; aucune suppression automatique |

Push, PR, fusion, déploiement production, Stripe Live et modification de production restent interdits et ne sont pas nécessaires à cette préparation.

## 13. Contrôles locaux

Résultats finaux ajoutés après vérification ci-dessous. Traces techniques sans valeurs de secrets conservées sous .git/lot7a-* : suite, build, audit npm, présence des variables. Le premier export npm PowerShell était illisible comme UTF-8 ; l'audit a été relancé par capture UTF-8 directe et son JSON vérifié, sans mise à jour des dépendances.

Ce document demeure un plan. Aucun paiement, migration distante, envoi Resend, ressource externe créée, publication, déploiement, audit IA payant ou Lot 7B déclenché.

## 14. Résultats effectivement vérifiés en 7A

| Contrôle exécuté | Résultat |
|---|---|
| Référence et création de branche | HEAD 1e5f3b5e0b85064633f9e319d69380f5a773f0ca ; qualification/shop-lot-7 |
| npm run test:security | 144 tests recensés : **143 réussis, 0 échec, 1 ignoré** |
| Test ignoré | Redis TCP local, REDIS_TEST_PORT absent ; pas une validation Upstash |
| npx tsc --noEmit --incremental false | Réussi |
| npm run build | Réussi, Next.js 15.5.28 et postbuild terminés |
| npm audit --json | Sortie 0, **0 vulnérabilité connue** (info/low/moderate/high/critical = 0), 197 dépendances recensées par npm |
| npm run security:check | Sortie 1, prérequis Strix manquants ; **audit Strix non exécuté** |
| Recherche de secrets | 264 fichiers indexés + ce rapport examinés, aucune signature de secret détectée ; ce scan n'est pas une certification |
| Exclusions Git | .env.local, .env.qualification.local, .env.production et .vercel/project.json exclus |
| git diff --check | Réussi ; aucun fichier suivi modifié après comparaison/retrait des seules générations sitemap |
| Intégrité Git | git fsck sortie 0 ; blobs détachés préexistants signalés sans corruption, aucun nettoyage |
| Branches précédentes/main | Références locales conservées |
| Original et sauvegarde | 235 fichiers de chaque dossier conformes au manifeste SHA-256, soit 470 vérifications |

Le rapport prépare **61 scénarios externes**, tous NE à cette date. Aucun PASS fonctionnel externe n'est enregistré.

Livraison : **docs/LOT7A-READINESS.md**, seul nouveau fichier non commité sur la branche de qualification ; aucun fichier sensible indexé, aucun commit/push/PR/fusion créé pendant 7A. HEAD reste volontairement la référence validée. Les traces sous .git ne sont pas destinées à publication.

Conclusion : **préparation et contrôles locaux effectués ; environnement externe non provisionné/non configuré ; NO-GO fonctionnel maintenu.** Les accords V0–V12 restent à obtenir selon les actions choisies avant de commencer le Lot 7B.
