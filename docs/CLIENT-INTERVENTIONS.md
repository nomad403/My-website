# Espace client et interventions — Lot 5

## Audit préalable et réutilisation

| Domaine | État avant Lot 5 | Décision |
|---|---|---|
| Sessions, rôles, MFA administrateur, limites de débit | Existant | Réutiliser les identités et protections des Lots 1–4 |
| Navigation privée dans /shop par paramètres URL, FR/EN | Existant | Compléter les sections sans nouvelle page /account |
| Projets, abonnements, prix historiques, factures, encaissements | Existant mais affichage partiel | Produire des vues serveur limitées au propriétaire |
| Stripe Checkout, webhooks, Portal | Existant | Réutiliser ; aucune nouvelle facturation |
| Profil client | Incomplet | Noms modifiables, e-mail vérifié non modifiable ici |
| Demandes, suivi, notes internes, temps | Absent | Migration 0004 et transactions dédiées |
| Périodes mensuelles sur abonnement annuel | Métadonnées insuffisantes | Conserver ancrage et preuve de service payé ; refuser les dates devinées |
| Notifications | Resend non qualifié | Outbox transactionnelle seulement, aucun envoi |

Migration 0003 examinée : administration des promotions du Lot 4 ; aucune table d'intervention à reprendre. Les migrations 0000 à 0004 sont exécutées dans les tests PGlite.

## Architecture

Les sections account, billing et interventions restent dans /shop?section=… ; request identifie le détail du suivi. Ce paramètre ne confère aucun droit. ClientWorkspace charge les données autorisées ; InterventionPanel est partagé entre le client et /admin. Aucun catalogue, tarif public/privé ou style global n'est changé.

Routes :
- GET/PATCH /api/account/dashboard : compte, projets, contrats, factures, paiements ; modification des noms seulement.
- GET/POST /api/account/interventions : liste et création.
- GET/PATCH /api/account/interventions/[id] : détail, messages et annulation autorisée.
- GET /api/admin/interventions et GET/PATCH /api/admin/interventions/[id] : gestion avec rôle administrateur et MFA.

Les routes utilisent le contrôle d'origine, les cookies et les identités existants. Le service valide strictement les champs, puis le store contrôle les objets et leur propriétaire. Les notes internes sont filtrées en SQL pour le client. Les réponses privées ne sont pas mises en cache. Le lecteur JSON partagé est borné à 8192 octets, y compris les corps fragmentés sans longueur fiable. Limites : lectures 240/h, créations 12/h, autres opérations 60/h ; échec du limiteur = refus.

Les listes sont bornées : 200 projets, 100 contrats, 100 dernières factures/paiements/écritures de temps ; demandes par pages de 50 et événements par pages de 100. Les comptes dépassant ces plafonds nécessiteront une évolution de pagination du tableau de bord. Les événements disposent d'une séquence pour ordonner plusieurs écritures de même date.

## Contrat et périodes

Seuls Premium et Friend Care peuvent disposer de 60 minutes par mois d'abonnement. Essential, Plus et Friend Host n'en reçoivent pas. Les prix existants restent figés ; le catalogue n'est jamais utilisé pour réécrire les contrats.

Le mois est calculé en UTC à partir du jour et de l'heure d'ancrage Stripe d'origine. Le jour est ramené au dernier jour du mois si nécessaire, puis retrouve le jour d'origine au mois suivant. Les périodes sont semi-ouvertes [début, fin). Un abonnement annuel ne donne jamais 720 minutes immédiatement. Aucun report, cumul, transfert de contrat vers un autre site ou crédit libre n'est créé.

Conditions du quota : statut active, ancrage connu, période de facturation connue et courante, facture payée liée au même abonnement avec ligne de service non proratisée couvrant la date. Une facture courante ouverte/non recouvrable restant due bloque le quota, même avant un webhook de statut. Le quota ne dépasse jamais la fin connue du service ou la date effective d'annulation. Les périodes suspendues conservent l'affichage du temps déjà consommé et n'accordent aucun temps restant.

Une divergence Stripe de formule, prix, périodicité ou ancrage pose un indicateur persistant de revue contractuelle ; elle ne réécrit pas le prix historique et ne réactive pas automatiquement le quota. Un événement plus ancien ne l'efface pas. La revue et une éventuelle remise en conformité nécessitent une procédure explicite ; aucun bouton de contournement n'est fourni.

Les anciennes lignes sans ancrage ou preuve de période payée restent non vérifiées. Il faut obtenir les données authentiques de Stripe avant d'accorder des droits. Rejouer uniquement un événement déjà traité ne garantit pas leur hydratation, du fait de l'idempotence existante. Aucun outil général de réconciliation ni backfill inventé n'a été ajouté.

## Traitement d'une demande

Le client renseigne site, objet, description, catégorie, urgence déclarée et informations complémentaires. L'urgence ne déclenche aucune priorité automatique. Soumettre ou accepter ne consomme pas de minutes et ne réserve pas de budget.

Transitions serveur :
- Soumise → analyse ou annulation.
- Analyse → acceptée, attente client, refusée ou annulée.
- Acceptée → en cours ou annulée.
- En cours → attente client, terminée ou annulée.
- Attente client → analyse, en cours ou annulée.
- Terminée, refusée et annulée sont terminales.

Le client ne peut annuler que soumise, analyse ou attente client. L'administrateur choisit explicitement inclus ou hors forfait. L'inclusion exige confirmation de modifications mineures et affectation au site ; un contrat non affecté est alors lié à ce site, sous verrou. Toute autre affectation est refusée. Aucun développement de fonctionnalité, refonte majeure ou acceptation automatique n'est promis.

La clôture d'une demande en cours enregistre le temps réellement réalisé, seulement après sa création, sans date future. Pour du temps inclus, la réalisation doit appartenir à la période contractuelle mensuelle actuelle ; aucune imputation rétroactive dans un ancien quota n'est permise. Une transaction verrouille la demande et l'abonnement, contrôle les droits, incrémente le compteur sous condition <=60, puis écrit temps, statut, audit et outbox ensemble.

Les clés d'opération et empreintes des contenus rendent créations, messages, transitions et clôtures idempotents. Une demande ne possède qu'une écriture de temps. Les écritures de temps sont immuables en base. Un échec d'audit/outbox annule toute la transaction. Les corrections de temps demanderaient une future procédure explicite et auditée ; aucune suppression silencieuse n'est autorisée.

Un dépassement est refusé : ne pas diminuer artificiellement le temps réel pour contourner le quota. Plusieurs demandes acceptées peuvent concurrencer le solde, sans garantie de disponibilité. Une demande hors forfait exige analyse/explication et éventuellement devis ; son temps est tracé sans quota, facture ni paiement automatique.

## Communication et exploitation

Messages client, réponses administrateur, changements de statut et notes internes conservent auteur et date. Les textes sont affichés comme texte React. Les audits ne copient pas les messages ou secrets. Les notes internes ne produisent pas d'outbox client.

L'outbox est une fondation future : aucun worker, aucun envoi Resend, aucune notification opérationnelle. L'interface l'indique. Le Portal existant reste le point d'entrée des résiliations ; une indisponibilité Stripe affiche une erreur explicite, sans modifier le contrat.

Appliquer 0004 avec le migrateur existant uniquement après qualification sur un environnement PostgreSQL autorisé et sauvegardé. Aucune migration n'a été appliquée à Neon pendant ce lot. La qualification externe requiert aussi synchronisation authentique des ancrages/périodes Stripe, services test configurés, MFA et validations multi-connexion. Voir le rapport de qualification pour les limites.
