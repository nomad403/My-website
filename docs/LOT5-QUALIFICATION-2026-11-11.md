# Qualification Lot 5 — 11 novembre 2026

## Périmètre et références

Implémentation locale sur feature/shop-lot-5-client, depuis b0ef9ecc57181ee96ae1cdd07422390adaf39144 (Lot 4). main reste 26e5de2aac1a20be225411d18a86b3a05897f883 ; recovery/shop-lots-1-2-3 reste d113d986d2830af246d2ae97af998efc4be4c273. Aucun push, PR, fusion, déploiement, paiement réel, ressource externe ni Lot 6.

Audit et architecture : [CLIENT-INTERVENTIONS.md](CLIENT-INTERVENTIONS.md).

## Fonctionnalités livrées

Espace client intégré aux paramètres de /shop : profil, contrats aux prix historiques, échéances/annulation, factures et paiements, accès Portal réutilisé. Demandes structurées par projet, fil public, notes privées administrateur, transitions serveur et historique. Gestion MFA dans /admin. Quota Premium/Friend Care de 60 minutes par mois ancré, même en annuel, avec compteur serveur, historique et clôture atomique/idempotente. Demandes hors forfait sans facturation automatique. Outbox préparée, notifications désactivées.

Les mécanismes existants d'authentification, MFA, sessions, débit, catalogue, Stripe, projets et navigation ont été réutilisés. Aucun changement du portfolio, de /specialist, des tarifs, des codes privés ou des styles globaux.

## Fichiers

Créés :
- drizzle/0004_client_interventions.sql.
- lib/interventions/{contract,service,http,view}.ts et lib/db/intervention-store.ts.
- lib/auth/read-json.ts.
- app/api/account/dashboard/route.ts ; app/api/account/interventions/route.ts ; app/api/account/interventions/[id]/route.ts.
- app/api/admin/interventions/route.ts ; app/api/admin/interventions/[id]/route.ts.
- components/shop/{ClientWorkspace,InterventionPanel}.tsx ; components/auth/AdminInterventions.tsx.
- tests/interventions.test.mjs et les deux documents Lot 5.

Modifiés :
- app/admin/page.tsx et components/shop/ShopExperience.tsx : intégration privée.
- lib/db/schema.ts : schéma miroir de 0004.
- lib/billing/{store,stripe-map}.ts et lib/db/billing-store.ts : ancrage, périodes de service et gel des divergences contractuelles.
- lib/auth/route.ts : réexport du lecteur JSON borné.
- package.json : inclusion des tests ; aucune dépendance ajoutée.
- tests/auth-security.test.mjs et tests/billing-stripe.test.mjs : droits MFA et panne Portal.

La route de démonstration temporaire est supprimée. Captures hors du dépôt, aucun fichier de secrets ajouté. Les sitemaps générés sont exclus du changement après comparaison des URL.

## GO automatisé local

Suite complète, TypeScript sans émission et build Next.js de production exécutés ; résultats finaux consignés ci-dessous après vérification. Les tests PostgreSQL utilisent PGlite et appliquent les migrations jusqu'à 0004, sans contacter Neon.

Couverture des 22 exigences minimales :
| Exigences | Preuves exécutées |
|---|---|
| 1–4 : contrat propre, isolation, non authentifié, absent | Dashboard propriétaire, aucun contrat autre client, refus avant store |
| 5–6 : résilié, panne Stripe | Quota nul contrat annulé ; Portal 503 sans mutation |
| 7–8 : création, validation | Création idempotente, champs stricts, identifiants et tailles |
| 9–12 : transitions, isolation détail, notes, messages | Graphe serveur, propriété, filtrage SQL et exclusion outbox interne |
| 13–16 : quota, report, annuel, calendrier | 60 minutes, mois ancrés, février bissextile, changement d'année |
| 17–18 : double imputation, dépassement | Unicité et immutabilité, deux clôtures concurrentes 40+40, refus >60 |
| 19–20 : hors forfait, impayé | Temps hors quota sans encaissement ; facture due bloque même avant statut |
| 21 : résiliation/formule | Troncature, divergence persistante, ancien webhook ignoré, prix historique préservé |
| 22 : Lots 1–4 | Suite antérieure complète, migrations et build |

Autres tests : affectation d'un contrat à un seul site ; Friend Care ; absence de métadonnées ; dates futures/ancienne période refusées ; consommation conservée après suspension ; rollback en échec outbox ; limiteur indisponible ; refus d'usurpation de rôle et notes ; lecture JSON fragmentée bornée et Unicode valide.

## Revue visuelle locale

Playwright avec API entièrement simulées et données fictives, français/anglais, largeurs 1440 et 390 px. Création au clavier, message client, note interne, clôture, panne Portal et absence d'abonnement exécutés. Aucun message d'erreur JavaScript observé. Notes internes absentes de l'affichage client. Cette revue ne prouve aucun parcours avec services externes.

Captures dans ../My-website-lot5-review/ :
1. 01-client-account-fr.png
2. 02-client-billing-portal-error-fr.png
3. 03-client-thread-fr.png
4. 04-client-thread-en-mobile.png
5. 05-admin-completed-fr.png
6. 06-admin-mobile-fr.png
7. 07-client-no-subscription-mobile-fr.png

La revue visuelle des captures client/admin mobiles confirme une présentation lisible avec l'identité existante. visual-review.json conserve les résultats sans secret.

## GO fonctionnel externe

Aucun. Neon, Resend et Stripe réels n'ont pas été utilisés. Aucun test non exécuté n'est déclaré réussi.

## NO-GO externe et limites

| Cause / constat | Gravité / conséquence | Action proposée |
|---|---|---|
| Neon, Resend et Stripe test non qualifiés | Bloquant publication fonctionnelle | Configurer avec autorisation puis exécuter les parcours externes des Lots 1–5 |
| Anciennes données sans ancrage/période payée | Droits inclus volontairement indisponibles | Récupérer les métadonnées Stripe authentiques avec une procédure de réconciliation auditée ; ne pas inventer les dates |
| Divergence de formule/prix/ancrage | Revue contractuelle requise | Examiner Stripe et le contrat, définir une remise en conformité explicite |
| Test atomique sous PGlite | Validation locale, pas preuve Neon multi-connexion | Tester concurrence et migrations en PostgreSQL externe autorisé |
| Outbox sans worker/envoi | Notifications non opérationnelles | Qualification et implémentation distinctes autorisées ultérieurement |
| Écritures de temps immuables, pas de correction UI | Limite opérationnelle | Définir une procédure de correction auditée avant exploitation étendue |
| Derniers 100 éléments dashboard | Historique borné pour gros comptes | Prévoir pagination si le volume réel le nécessite |
| Strix disponible sur ancienne référence recovery seulement | Aucun nouvel audit distant Lot 5 | Faire auditer cette branche après autorisation de publication |

Strix de référence : workflow security tests 42962258754 réussi ; Strix 42962258650 échoué sur une énumération de promotions de gravité moyenne (CWE-203), corrigée localement au Lot 4. Aucun résultat haut/critique dans cet artefact. La confiance dans les en-têtes IP Vercel reste une limite basse à qualifier sur l'hébergement réel. Aucun audit distant Lot 5 prétendu.

## Sécurité et Git

Contrôles finaux des chemins indexés, règles .gitignore, empreintes de secrets et absence de .env.local avant commit local. Aucun secret n'est inclus dans les captures, journaux ou ce rapport. Les identifiants, rôles, prix et minutes ne sont pas acceptés comme droits fournis par le client.

Le commit local clôt uniquement la qualification locale. Le statut global demeure NO-GO externe jusqu'à exécution des validations réelles.

## Résultats finaux vérifiés

- npm run test:security : 113 tests recensés, 112 réussis, 0 échec, 1 test Redis externe ignoré faute de configuration (jamais compté comme réussi).
- Dont 28 tests interventions, plus les nouveaux contrôles MFA administrateur et panne Portal.
- npm run build : réussi, génération de production et postbuild terminés.
- npx tsc --noEmit --incremental false : réussi.
- Smoke HTTP sur le build de production : 13 contrôles réussis, dont 401 sans session, 403 sans MFA ou origine étrangère avec cookie signé, 404 de la page temporaire supprimée, 200 sur /, /shop et /specialist.
- Le premier lancement du script HTTP attendait à tort un contrôle d'origine avant authentification pour deux requêtes sans cookie ; le middleware a correctement renvoyé 401. Le script a été corrigé pour fournir le cookie signé requis, puis les 13 contrôles ont réussi. Aucun défaut applicatif démontré.
- Revue visuelle simulée : 7 captures, FR/EN, desktop/mobile, aucun événement pageerror.
- Empreintes : les 235 fichiers de l'original et les 235 fichiers de la sauvegarde correspondent toujours au manifeste de récupération (470 vérifications).
- Références main, recovery et Lot 4 inchangées avant commit ; branche dédiée vérifiée.
- Sitemaps générés comparés sans dates de génération, mêmes URL/contenus, restaurés à la version de référence pour éviter une modification hors périmètre.

Les contrôles automatisés ne constituent pas une qualification fonctionnelle avec Neon, Resend ou Stripe. Aucune régression démontrée dans les parcours locaux exécutés.

Contrôle avant commit : 28 fichiers Lot 5 indexés (18 nouveaux, 10 modifiés), 250 fichiers versionnés examinés ; aucun chemin sensible interdit ni correspondance aux signatures de clés privées, tokens, clés Stripe/Resend ou URL de connexion avec identifiants. Les fichiers .env.local et configurations sensibles restent exclus par .gitignore. Ce contrôle de signatures complète la revue des chemins et ne remplace pas une future analyse de sécurité externe.
