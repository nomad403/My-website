# Harmonisation des cartes Shop

## Audit et perimetre

Branche qualification/shop-lot-7. Composant existant : components/shop/ShopExperience.tsx. Donnees FR/EN : lib/shop/catalog.ts. Prix et identifiants : lib/shop/plans.ts. Eligibilite : lib/interventions/contract.ts ; plafond de 60 minutes impose par les magasins et migrations PostgreSQL/D1.

Seuls le contenu commercial public, ses traductions et l'alignement des listes sont ajustes. Aucun changement de plans.ts, Price IDs, Stripe, migrations, regles de quota, abonnements existants ou offres privees. Les boutons, le cadre, les couleurs, le curseur, le fond ASCII, le switch et la navigation sont conserves. Aucun tableau comparatif externe ni nouveau composant de cartes.

## Tarifs et quotas conserves

| Formule | Mensuel | Annuel | Contenu mineur inclus |
|---|---:|---:|---|
| Essential | 19 EUR | 190 EUR | Aucun |
| Plus | 49 EUR | 490 EUR | Aucun |
| Premium | 69 EUR | 690 EUR | 60 minutes par mois d'abonnement, sans report |

Les propositions Premium 89 EUR, Plus 30 min/mois et Premium 90 min/mois ne sont pas appliquees. Les annoncer comme disponibles contredirait le catalogue et les regles actuelles. Elles necessitent une decision commerciale et une intervention contractuelle distinctes. Les limites restent mensuelles, y compris en facturation annuelle. Les nouveaux developpements restent sur devis.

Friend Host reste a 10 EUR/mois, Friend Care a 20 EUR/mois, sans prix annuel. Leurs identifiants, droits, acces prives et contrats ne sont pas modifies. Les prix copies sur les abonnements et commercialTerms catalog-v1 sont conserves.

## Textes commerciaux

- Essential : « Votre site hébergé, surveillé et protégé. » / « Your website hosted, monitored and protected. »
- Plus : « Votre site protégé et suivi régulièrement. » / « Your website protected and regularly maintained. »
- Premium : « Votre site protégé, entretenu et accompagné. » / « Your website protected, maintained and supported. »

Plus utilise « suivi » plutot que « actualise » pour ne pas promettre les modifications de contenu non incluses par son contrat actuel.

Les dix criteres communs sont, dans cet ordre : hebergement du site, certificat HTTPS, surveillance du site, protection contre les attaques courantes, controle de securite, sauvegardes, modifications de contenu, rapport d'activite, assistance prioritaire, accompagnement personnalise. Chaque carte garde sa propre liste. Les intitules sont partages dans les deux langues ; seuls les niveaux changent. Les exclusions restent visibles avec un tiret et un libelle accessible attenue. Essential est inclus dans Plus, lui-meme inclus dans Premium.

## Preuves operationnelles et prestations a preparer

L'audit du depot n'est pas une certification des sites clients. Un service inclus commercialement ne prouve pas son activation sur un projet donne.

| Service | Constat | Presentation retenue / action restante |
|---|---|---|
| Hebergement et HTTPS | Portfolio deploye, mais aucun provisionnement universel des sites clients prouve | Inclus commercialement ; verifier la mise en place pour chaque projet |
| Surveillance continue | Pas de preuve de sondes clients actives ni de circuit d'alerte qualifie | Continue, avec mention « A configurer » |
| Protection contre les attaques courantes | Protections applicatives du Shop presentes ; absence de preuve d'une configuration WAF par site client | Incluse, avec mention de configuration et verification ; pas de securite absolue promise |
| Controle mensuel | Outillage Strix/CI du projet distinct d'une prestation mensuelle des sites clients | Mensuel, avec mention « A planifier » |
| Sauvegardes automatiques | Cache R2 et stockage Shop ne constituent pas une sauvegarde client ni une restauration testee | Automatiques, avec mention de configuration et tests de restauration |
| Rapports simplifies/detailles | Pas de generation automatique de rapports clients qualifiee | Remise manuelle a organiser pour Plus/Premium |
| Assistance prioritaire | Priorite administrable sur les interventions ; aucun delai contractuel prouve | Premium : incluse, sans delai garanti |
| Bilan trimestriel personnalise | Prestation humaine, aucun rendez-vous qualifie | Premium : a planifier |

Ces reserves sont visibles dans les lignes concernees, pas masquees dans une promesse generale. Aucun de ces services n'a ete active a distance dans cette intervention. Aucun paiement ni e-mail envoye.

## Alignement et verification

Les grilles CSS existantes partagent les hauteurs des descriptions, prix, dix criteres et boutons via des sous-grilles internes. Les lignes peuvent revenir a la ligne sans chevauchement ni troncature. Sur mobile, les cartes restent empilees et les textes circulent normalement.

Une premiere mesure d'alignement n'avait pas detecte un chevauchement. La revue visuelle l'a revele avant publication ; les proprietes de placement ont ete corrigees et le test navigateur verifie desormais aussi l'ordre vertical et l'absence de chevauchement.

- TypeScript : reussi.
- Tests securite/metier : 153 reussis, aucun ignore.
- Tests D1 : 39 reussis, aucun ignore.
- Build Next.js/OpenNext final : reussi.
- Test navigateur tests/shop-layout.test.mjs : 12 combinaisons FR/EN, mensuel/annuel, 1440/820/390 px ; 12 reussites, aucun ignore. Controle de chaque ligne, absence de chevauchement, prix et boutons alignes, aucun debordement ni erreur JavaScript. Captures finales relues.

Pour reproduire avec Node 22 et les navigateurs Playwright installes :

1. npm ci, puis npm run test:security et npm run test:d1.
2. npm run build:cloudflare.
3. Generer la configuration locale (aucun secret requis pour la verification visuelle publique) :

    node --input-type=module -e 'import {readFileSync,mkdirSync,writeFileSync} from "node:fs"; import {previewConfigs} from "./scripts/preview-config.mjs"; const plan=previewConfigs(JSON.parse(readFileSync("wrangler.jsonc","utf8")),{branch:"qualification/shop-lot-7",buildId:readFileSync(".next/BUILD_ID","utf8").trim()}); mkdirSync(".wrangler/shop-layout",{recursive:true}); writeFileSync(".wrangler/shop-layout/wrangler.json",JSON.stringify(plan.runtime));'

4. Appliquer les migrations uniquement localement :

    npx wrangler d1 migrations apply SHOP_DB --local --config .wrangler/shop-layout/wrangler.json

5. Demarrer le serveur local dans un terminal :

    npx wrangler dev --local --config .wrangler/shop-layout/wrangler.json --ip 127.0.0.1 --port 8788

6. Dans un autre terminal, executer node tests/shop-layout.test.mjs.

SHOP_LAYOUT_ORIGIN accepte seulement localhost:8788 ou la Preview de qualification ; toute cible de production est refusee. Le test n'envoie aucun formulaire. Aucune migration distante dans cette intervention. L'absence de secrets empeche les parcours proteges mais pas ces lectures de mise en page publique.

## Fichiers

lib/shop/catalog.ts ; components/shop/ShopExperience.tsx ; tests/shop-catalog.test.mjs ; tests/shop-layout.test.mjs ; ce rapport. Aucune dependance ajoutee. Rapports historiques 7A/7B.1 locaux preserves. Publication uniquement sur la branche Preview ; aucun deploiement de production.
