# Administration globale et pilotage financier — Lot 6

## Audit et choix d'architecture

| Domaine | Réutilisable au départ | Lacune / réponse Lot 6 |
|---|---|---|
| /admin | Page serveur avec session, rôle et MFA ; résumé et listes Stripe | Remplacement de l'assemblage des listes non paginées par une console unique |
| Identités et sécurité | adminIdentity, middleware, cookies, contrôle d'origine, limiteur | Même système pour toutes les nouvelles lectures ; aucun nouveau rôle |
| Clients | users, customer_profiles, projets | Recherche et fiches : rôle client, ou présence billing locale (abonnement / customer Stripe), y compris un admin qui souscrit |
| Abonnements | Snapshots de prix et dates, protection contre événements anciens et égalités | Vues détaillées, distinction local/confirmé, historique local append-only |
| Finances | Six anciens totaux théoriques, sans dates | Six indicateurs distincts, agrégats par devise et diagnostics |
| Promotions | Moteur et interfaces Lot 4 | Réutilisation dans la navigation, utilisations consultables par client |
| Interventions | Moteur Lot 5 complet et temps atomique | Liste filtrée, priorité interne auditée, détail et commandes réutilisés |
| Stripe | Webhooks signés et idempotence objet | Transaction de livraison sérialisée, reprise et remboursements multiples |
| Strix | Ancien artefact recovery uniquement | Pas d'audit distant du Lot 6 ; ne pas extrapoler son résultat |

La console reste sous /admin?section=… avec client, subscription et request pour les sélections. Les sections sont vue d'ensemble, clients, abonnements, factures, encaissements, remboursements, interventions, promotions, utilisations, historique et journal. Les paramètres URL ne confèrent aucun droit. Aucun nouveau moteur de promotions ou d'interventions.

Les nouvelles routes GET /api/admin/overview, /api/admin/records et /api/admin/clients/[id] passent par adminHttp et administer. Les identités sont vérifiées avant les données ; limites de 180 lectures/h par administrateur, échec fermé si le limiteur échoue. L'ancien résumé conserve son contrat API et sa logique historique ; il n'alimente plus la console et reçoit une limite de 60/h.

DrizzleAdminStore réalise les agrégats et la pagination en SQL, avec paramètres liés (y compris recherches littérales de %, _ et antislash). Les pages de 25 éléments comportent un total exact, même au-delà de la dernière page. Total et lignes, ainsi que les différents agrégats d'une vue d'ensemble, utilisent une transaction repeatable read/read only. Aucun ensemble client complet n'est chargé dans le navigateur pour simuler une pagination.

Les mutations restent sur les routes des Lots 4 et 5. Les tableaux sont des cartes de résultats avec détails dépliables, adaptés au mobile ; pas de style global ni dépendance ajoutée.

## Périodes et fraîcheur

Les dates de filtre sont UTC, début inclus et fin exclue ; défaut = mois UTC courant. Le bouton Toutes les dates depuis 2000 élargit explicitement la période. Le maximum accepté est 100 ans. Les listes utilisent :
- Clients, abonnements, interventions et utilisations : création de l'objet.
- Factures : émission, ou date locale d'enregistrement si l'émission est inconnue.
- Paiements : réception, ou enregistrement local si réception inconnue.
- Remboursements : confirmation de succès, ou enregistrement local si inconnue.
- Historique et journal : date d'observation/d'opération locale.

Les dates de repli des listes ne sont jamais utilisées pour les montants financiers. Le profil client lui-même n'est pas limité par la période.

La vue d'ensemble sépare situation actuelle (clients, statuts, demandes ouvertes/en attente, promotions disponibles, MRR/ARR) et flux sur la période (créations, factures, paiements, remboursements). Le solde impayé est actuel, restreint aux factures émises avant la borne de fin. Ni le MRR ni les stocks ne sont une reconstruction historique à la date sélectionnée.

La dernière réception connue vient de stripe_events.created_at, qui enregistre un événement traité ; ce n'est ni une relecture exhaustive de Stripe ni une preuve d'absence de retard. Chaque abonnement expose son dernier horodatage Stripe connu et les dates contractuelles ; un identifiant Stripe seul ne prouve pas la fraîcheur. Les écarts contractuels sont signalés sans réécrire les prix.

## Règles financières

Les montants sont des unités monétaires mineures entières, présentées par devise. Les contraintes de production actuelles n'acceptent que EUR ; le regroupement par devise empêche néanmoins toute addition implicite si ce périmètre évolue. Aucune conversion ni commission Stripe, transaction bancaire, reconnaissance de revenu ou certification comptable n'est calculée.

### MRR

Estimation contractuelle actuelle, selon une politique prudente propre à Nomad403, distincte du MRR du Dashboard Stripe :
- Statut active uniquement, abonnement identifié chez Stripe et événement connu.
- Prix historique et périodicité du snapshot, jamais le catalogue courant.
- Période de service connue et en cours, résiliation non effective, aucune revue contractuelle en attente.
- Facture payée liée au contrat, période de service couvrant maintenant, aucun reste exigible connu sur le service courant.
- Contrats trialing, past_due, unpaid, canceled, incomplete, expirés ou incomplets exclus et, pour les actifs, signalés dans le compteur d'exclusion.

MRR = arrondi au centime de (somme des montants mensuels × 12 + somme des montants annuels) / 12. L'arrondi porte sur l'agrégat par devise, pas chaque contrat annuel. ARR = MRR arrondi × 12 ; quelques centimes d'écart avec la somme annuelle brute sont donc possibles.

Les remises propres aux tarifs privés sont déjà dans le snapshot contractuel. Les remises Stripe externes, quantités, taxes ou changement de formule non représentés dans le snapshot ne sont pas reconstitués ; un écart reconnu entraîne la revue contractuelle. La base fiscale du snapshot n'étant pas isolée, l'interface ne présente pas ce MRR comme du revenu HT certifié. Le prorata ne modifie pas arbitrairement le prix contractuel.

Le principe de normalisation et les différences possibles de politique sont documentés par [Stripe sur MRR/ARR](https://support.stripe.com/questions/understanding-monthly-recurring-revenue-%28mrr%29-and-annual-recurring-revenue-%28arr%29?locale=en-GB).

### Facturé

Somme de invoice.total persisté pour les factures open, paid et uncollectible, émises dans la période. Ce total conserve les remises, taxes et proratas tels que fournis par Stripe. Il est distinct de amount_due, qui peut intégrer un crédit ou un solde antérieur. Les valeurs négatives éventuelles sont conservées. Les factures draft ou void sont exclues selon leur état actuel ; ce n'est pas un livre d'écritures historiques ni un suivi des avoirs/credit notes.

L'ancien schéma ne possédait que les montants exigibles/payés/restants. 0005 ajoute total_cents nullable, sans l'inventer pour l'historique. Les totaux inconnus sont exclus et signalés. Voir les distinctions dans [l'objet Invoice de Stripe](https://docs.stripe.com/api/invoices/object).

### Encaissé

Somme brute des paiements succeeded à leur paid_at, distincte des factures. Les paiements pending/failed/canceled ne comptent pas. Les remboursements ne sont pas soustraits ; le net n'est pas un septième indicateur implicite. Les factures paid avec montant payé positif sans paiement succeeded lié sont signalées : on ne crée pas un encaissement pour combler le manque.

Seuls les paiements effectivement enregistrés par l'intégration existante sont comptés. La compatibilité des payloads et des liens de paiement avec le compte Stripe réel reste à qualifier, notamment les versions utilisant invoice.payments. La réception d'une facture payée ne suffit pas à certifier des fonds réglés sur le compte bancaire.

### Remboursements

Somme des refunds succeeded selon succeeded_event_at : horodatage du premier événement Stripe accepté confirmant le succès dans le système. Ce n'est pas la date de règlement bancaire, ni refund.created supposé être une date de réussite. Les dates inconnues des anciennes lignes sont signalées, sans backfill.

Chaque remboursement d'une charge présente dans le payload est mappé indépendamment ; les événements directs et ceux de charge ne doublent pas le remboursement, grâce à stripeRefundId unique et aux règles existantes de fraîcheur. Une liste Stripe paginée n'est pas parcourue automatiquement ; la réception des événements individuels et la complétude de l'historique restent des points de qualification externe. Les statuts non pris en charge par le schéma historique, par exemple requires_action, ne sont pas présentés comme réussis.

[L'objet Refund de Stripe](https://docs.stripe.com/api/refunds/object) distingue création, statut et transaction de solde.

### Impayés

Somme des amount_remaining des factures open/uncollectible émises avant la borne de fin, dans leur état actuel. Le début du filtre n'est pas appliqué à ce stock : une ancienne créance encore ouverte reste due. Ce n'est pas un indicateur de retard bancaire ni un échéancier : due_date n'est pas persisté. Les factures payées/annulées et les dates inconnues ne sont pas ajoutées. Aucun montant d'abonnement n'est additionné une seconde fois aux impayés.

### Retards et données manquantes

Les flux sont classés par dates source connues, pas par date de réception du webhook (sauf la base explicite de confirmation de remboursement). Les événements tardifs peuvent donc corriger une ancienne période. Les stocks reposent sur les derniers états locaux, sans extrapolation après la fin connue du service. Les diagnostics comptent les contrats actifs exclus, dates de facture/paiement/remboursement manquantes, totaux absents et factures sans encaissement lié. Ils sont globaux dans chaque devise, afin de ne pas masquer des lignes impossibles à dater.

## Migration, historique et concurrence

0005_admin_pilotage.sql ajoute :
- internal_priority, défaut normal et contrainte low/normal/high/urgent.
- Le type d'événement priority, conservé comme interne.
- succeeded_event_at nullable pour les remboursements et total_cents nullable pour les factures.
- Des index de dates/listes.
- subscription_observations, trigger transactionnel d'observation, et protection UPDATE/DELETE.
- billing_sync_lock, ligne unique de sérialisation des livraisons Stripe.

Les observations commencent après la migration, sans inventer l'historique des lignes antérieures. Elles conservent prix, périodicité, état, dates contractuelles/résiliation et indicateur de revue. Elles représentent les changements d'état connus localement, pas les payloads Stripe complets.

applyStoredBillingEvents prend le verrou de livraison puis applique les notices et enregistre les reçus dans la même transaction. Tout retry ou exception annule la livraison complète. L'attente du verrou est limitée à 5 s ; une relecture Stripe d'égalité est bornée à 5 s sans retry réseau interne, puis la livraison pourra être retentée par Stripe. Le verrou global privilégie la cohérence pour le faible volume attendu ; il limite le débit de traitement et doit être validé sur Neon avant exploitation. Les anciennes méthodes du store sont des primitives internes ; la route webhook utilise obligatoirement l'enveloppe transactionnelle.

Les verrous de demande et d'abonnement ainsi que l'incrément conditionnel du compteur Lot 5 restent inchangés. La priorité est une mutation administrative interne, idempotente, sous verrou de demande, auditée, sans outbox client. Le client ne reçoit ni le champ ni l'événement. Elle ne dépend jamais automatiquement de l'urgence déclarée.

Un dépassement du temps inclus reste refusé, sans paiement supplémentaire. Une demande acceptée incluse ne change pas silencieusement de couverture : une nouvelle demande hors forfait, avec analyse et explication, est nécessaire si ce traitement est choisi. Aucun temps réel ne doit être minoré pour contourner le quota.

Appliquer la migration uniquement via le migrateur existant après sauvegarde et qualification PostgreSQL autorisée. Elle n'a pas été appliquée à Neon dans ce lot.
