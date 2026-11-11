# NOMAD403 ? Securisation des Previews Cloudflare

Date : 2026-11-11. Branche : fix/cloudflare-worker-self-reference.
Reference locale et publiee : 539708cd4201d8c19099c2bcb9291449fe347c52.
Statut : preparation locale verifiee ; **NO-GO Preview distant**.

## Decision et portee

Un simple bloc previews ne rend pas OpenNext 1.20.16 integralement compatible avec les Worker Previews isolees. La configuration proposee supprime toute cible de service de production et separe le R2, mais ne remplace pas encore le mecanisme de revalidation interne. Elle n'est pas une configuration distante prete a publier.

Aucune ressource distante creee, aucune relance, aucun push ni commit pendant cette preparation. Aucun changement de main, DNS OVH, Vercel ou Lots 1?6. Les parametres de production au niveau racine du fichier Wrangler sont conserves identiques au commit de reference. open-next.config.ts et les scripts npm restent inchanges.

## Configuration proposee, preparee localement

Ajout dans wrangler.jsonc :

```json
"previews": {
  "vars": { "NOMAD403_ENV": "preview" },
  "services": [],
  "r2_buckets": [{
    "binding": "NEXT_INC_CACHE_R2_BUCKET",
    "bucket_name": "nomad403-preview-opennext-cache"
  }],
  "images": { "binding": "IMAGES" }
}
```

nomad403-preview-opennext-cache est un **nom propose**, pas un bucket dont l'existence ou l'exclusivite a ete verifiee. Il devra etre confirme ou remplace par le nom exact autorise, puis cree uniquement apres autorisation. Aucun identifiant ni secret invente.

Le controle scripts/check-cloudflare.mjs accepte uniquement les champs Preview ci-dessus, refuse un service binding et exige que le bucket Preview differe du bucket racine. Il verifie le fichier local ; il ne constitue ni une politique IAM ni une verification de la configuration distante. Son message distingue desormais validation locale et NO-GO distant.

## Syntaxe et repartition des bindings

La documentation actuelle place les variables et ressources dans previews. ASSETS, la date et les flags de compatibilite restent au niveau racine. Images doit etre redeclare sous previews ; il s'agit d'une API du compte, pas d'un stockage d'images dedie. Les secrets Preview ont leur propre configuration Base et peuvent etre copies aux nouvelles Previews : l'absence de variables de build visible dans la capture ne prouve pas l'absence de secrets runtime.
Source : [configuration Cloudflare](https://developers.cloudflare.com/workers/previews/configuration/).

| Binding / parametre | Cible Preview proposee | Verification / limite |
| --- | --- | --- |
| NEXT_INC_CACHE_R2_BUCKET | nomad403-preview-opennext-cache | Stockage exclusivement non-production a creer apres accord |
| WORKER_SELF_REFERENCE | Aucun service binding | Empeche l'appel au Worker my-website actif ; fonctionnalite de loopback encore manquante |
| ASSETS | .open-next/assets du build courant | Reste racine ; fichiers branches televerses par la commande Preview |
| IMAGES | API Images du compte | Redeclare sous previews ; pas de nouveau bucket ; usage potentiellement facture au meme compte |
| NOMAD403_ENV | preview | Marqueur non secret, n'est pas a lui seul une protection runtime |
| Resend / Redis / KV / credentials | Aucun configure dans le fichier Preview | Inventaire distant Base et Preview a verifier avant toute operation |
| Routes / domaines / triggers | Aucun ajoute | Aucune association DNS ni cron de production |

Les autres bindings de donnees (D1, KV, Queues, Hyperdrive, etc.) sont absents de cette base portfolio et ne sont pas ajoutes.
Deux Previews liees au meme bucket partagent ses objets ; un bucket Preview dedie isole la production, pas chaque branche. Choisir un bucket par branche si une separation entre Previews est exigee. Les clefs OpenNext incluent un identifiant de build ; cela n'est pas une autorisation d'acces distincte.
Source : [ressources et isolation](https://developers.cloudflare.com/workers/previews/resources/).

## Blocage WORKER_SELF_REFERENCE : cause confirmee

La documentation Cloudflare precise qu'un service binding depuis une Preview appelle le deploiement actif du Worker cible. Un nom de branche ou l'URL Preview ne constitue pas une cible service equivalente. Cloudflare recommande ctx.exports pour les appels au sein de la meme Preview.
Source : [limitation des service bindings](https://developers.cloudflare.com/workers/previews/resources/#service-bindings).

L'inspection du paquet installe OpenNext 1.20.16 confirme :
- dist/cli/build/patches/plugins/res-revalidate.js reecrit la revalidation Next vers env.WORKER_SELF_REFERENCE.fetch ;
- dist/api/overrides/queue/memory-queue.js utilise ce binding si cette queue est choisie ;
- dist/api/durable-objects/queue.js en depend egalement si cette option est activee ;
- le code contact du projet exige actuellement un binding self valide avant d'accepter l'identite cliente Cloudflare.

Dans notre open-next.config.ts, seule l'implementation R2 est configuree ; la queue par defaut est dummy, et les queues optionnelles ci-dessus ne sont pas revendiquees actives. Le patch de revalidation demeure dans l'adaptateur. Supprimer le service est donc une mesure d'isolation, pas un remplacement fonctionnel complet. L'audit est une preuve de code ; aucun appel distant de revalidation n'a ete execute.

Solutions :
1. **A privilegier pour conserver npx wrangler preview** : valider une adaptation de Worker OpenNext utilisant un WorkerEntrypoint local via ctx.exports, puis fournir cette reference a l'env interne d'OpenNext pour la seule Preview. Tester revalidation, propagation du contexte, appels imbriques et absence totale de fallback reseau vers my-website. Cette adaptation n'est pas implementee ni qualifiee ici ; ne pas inventer un champ Wrangler service visant une Preview.
2. Alternative : Worker de staging distinct, avec son propre self binding et bucket, deployee par une procedure non-production dediee. Elle necessite creation/deploiement autorises et modifie le workflow demande. Pointer une Preview vers le deploiement actif de ce Worker de staging ne prouverait pas que la revalidation utilise le meme SHA que la Preview.
3. Attendre une prise en charge native documentee par l'adaptateur.

Ne pas retablir service=my-website dans previews pour faire disparaitre une erreur : cela violerait l'isolation demandee. Ne pas masquer le probleme avec une desactivation des verifications OpenNext.

## Compatibilite des commandes demandees

- **npm run build:cloudflare** : execute avec succes. Produit le bundle sans operation distante et conserve les protections de validation. Lit la configuration racine ; un build reussi ne verifie pas le runtime Preview ni les droits R2.
- **npx wrangler preview** : commande presente dans Wrangler 4.160.1, aide locale verifiee. Le bloc propose est reconnu par son parseur. Publication non executee. Compatibilite fonctionnelle OpenNext encore bloquee par le loopback et le cache.
- **npm run preview:cloudflare** : signifie ici le serveur de developpement LOCAL de la CLI OpenNext, pas une publication de Worker Preview Cloudflare. Ne pas confondre ces deux usages.
- **npm run deploy:cloudflare** : ne doit pas etre utilise pour publier cette Preview ; publie un deploiement actif.

OpenNext fournit une etape populateCache et ses commandes deploy/upload la realisent avant publication. La commande Wrangler brute ne realise pas cette etape applicative. L'inspection du paquet confirme que populateCache selectionne config.r2_buckets (racine ou environnement nomme), et non config.previews.r2_buckets. **Ne jamais lancer populateCache remote avec le fichier racine actuel**, car il selectionnerait le cache de production. Il faudra generer une configuration auxiliaire ne contenant que le bucket Preview et verifier cette cible avant toute population autorisee. Les flags preview_bucket_name de developpement distant ne remplacent pas le bloc Worker Previews.
Source : [CLI OpenNext](https://opennext.js.org/cloudflare/cli).

## Secrets et variables

Verifications locales :
- seules .env.contact.example et .env.strix.example sont presentes parmi les fichiers env examines ;
- aucune cle Preview ni cle de production fournie ou ajoutee ;
- NOMAD403_ENV=preview est la seule variable du bloc propose ;
- .env.local, .dev.vars*, .open-next, .wrangler et les preuves temporaires sont ignores.

Non verifie a distance : noms et cibles des secrets Previews Base, secrets d'une Preview existante, variables build et runtime. Ne pas exporter leurs valeurs pour l'audit. Pour ce premier portfolio, conserver Resend/Redis/KV sans credentials dans la Preview et dans son build. Si ces integrations sont qualifiees plus tard, creer des ressources et secrets de test independants avec autorisation separee.

La commande exacte npx wrangler preview peut tenir compte de la Base distante. Son aide expose --ignore-base-config, mais cette option ne remplace pas l'audit des secrets existants et sort de la commande exacte demandee. Avant de conserver la commande sans flag, inspecter la Base et toute Preview existante, et exclure explicitement tout binding ou credential de production. Un token de build nomme my-website build token ne prouve pas ses droits ni leur restriction.

## Verifications locales executees le 11 novembre

| Controle | Resultat |
| --- | --- |
| Git branche et HEAD | Branche demandee ; HEAD 539708cd4201d8c19099c2bcb9291449fe347c52 |
| Parseur Wrangler 4.160.1 unstable_readConfig | Bloc previews reconnu sans erreur |
| check-cloudflare | Cibles locales conformes, services Preview vides |
| TypeScript | Reussi |
| npm run test:security | 21 tests : 20 reussis, 1 ignore, 0 echec |
| Test ignore | Redis TCP externe absent ; non execute |
| npm run build:cloudflare | Next 15.5.29 puis OpenNext 1.20.16 reussis |
| Simulation workerd --local | ASSETS, Images et R2 locaux ; aucun service binding |
| HTTP simulation | /, /projects, /specialist, /signature, /card et police ProFont : 200 |
| /shop simulation | 404 attendu, Lots Shop exclus |
| POST /api/contact valide | 503 attendu, aucun envoi |
| Revalidation via loopback Preview | Non executee, adaptation absente |
| Deploiement / URL distante / erreur 10143 distante | Non testes, aucune relance |

La simulation utilise un fichier temporaire ignore aplatissant uniquement les champs Preview, avec main/assets resolus localement, et wrangler dev --local sur 127.0.0.1:8788. Elle ne simule pas la fusion Base Cloudflare ni son controle d'acces ; les routes publiques fonctionnant sans population prealable ne prouvent pas la validite des chemins ISR/revalidation.
Preuves : .cloudflare-review/preview-build.log, preview-security.log, preview-tsc.log, preview-isolation-runtime.log, preview-isolation-http.json.
Les audits visuels du commit precedent ne sont pas comptes comme reexecutes dans cette preparation. Aucun composant graphique ou fichier applicatif n'a change.

## Ressources manquantes et autorisations

| Action | Situation / autorisation |
| --- | --- |
| Creer et verifier nomad403-preview-opennext-cache | Existence inconnue ; accord explicite requis avant creation |
| Lire les parametres Base/runtime et IAM Cloudflare | Pas d'acces disponible ; le proprietaire peut fournir noms et cibles sans valeurs |
| Modifier Previews Base build command | Accord explicite requis ; ne pas modifier l'onglet Production |
| Ajouter / modifier des secrets distants | Pas necessaire au premier essai sans contact ; accord requis si envisage |
| Publier un nouveau commit de preparation | Non fait ; accord de push supplementaire requis |
| Peupler le cache R2 Preview | Mutation distante, accord requis et cible auxiliaire controlee |
| Lancer npx wrangler preview | Accord et prerequis resolus requis ; non lance |
| Creer un Worker staging alternatif | Accord distinct requis ; aucune ressource creee |

## Procedure du premier deploiement securise

Cette procedure est bloquee aux etapes 1 et 2 ; ce n'est pas une invitation a lancer le build distant maintenant.

1. Resoudre et tester le loopback OpenNext via ctx.exports, ou faire approuver explicitement l'alternative staging. Conserver services Preview vides ; prouver que toute revalidation reste dans le code Preview du SHA courant. Ajouter des tests de non-regression avant publication.
2. Faire confirmer le nom du bucket Preview par le proprietaire, autoriser sa creation si absent, puis verifier son exclusivite et les droits du token. Auditer Base, Preview existante, variables build et secrets runtime. Aucune cible de production autorisee.
3. Preparer et tester une population de cache prenant une configuration auxiliaire Preview seule, sans bucket/service de production. Verifier comment cette etape sera integree au pipeline. Tant qu'elle n'est pas resolue, les deux commandes demandees ne constituent pas un pipeline OpenNext pleinement qualifie.
4. Refaire TypeScript, securite, build et simulation locale avec loopback et cache. Scanner les fichiers suivis, verifier Git et confirmer un nouveau SHA local (les modifications actuelles ne sont pas commitees). Faire valider ce resultat avant tout push.
5. Avec autorisation, regler seulement Previews Base : Build = npm run build:cloudflare ; Preview = npx wrangler preview ; racine /. Maintenir main comme branche de production et laisser les commandes Production intactes. Aucune modification DNS/Vercel.
6. Avec autorisation, pousser uniquement fix/cloudflare-worker-self-reference. Si aucun commit nouveau n'est cree, un push identique ne declenche pas necessairement de build : ne pas fabriquer un commit vide ni relancer automatiquement.
7. Avant la premiere mutation distante, confirmer a nouveau bucket, bindings effectifs, secrets absents/test et SHA. Executer la population autorisee exclusivement sur le bucket Preview, puis la commande Preview convenue. Aucun deploy actif sur my-website.
8. Dans les logs, verifier depot/branche/SHA, binding R2 Preview, absence de service vers production, presence Assets/Images et absence de 10143. Recuperer l'URL Preview et verifier son association au SHA. Ne pas se contenter d'une URL creee avec avertissements de bindings manquants.
9. Tester GET routes/assets/fonts/audio/signature, navigateur/WebGL, ainsi que loopback/revalidation sur cette URL. Maintenir le contact sans envoi reel et verifier son refus. Ne jamais tester de paiement ou de donnees Shop.
10. GO Preview uniquement apres ces preuves et un deploiement distant reussi. Cette decision ne constitue pas une autorisation de migration production.

## Blocages restants

- **Bloquant fonctionnel** : loopback OpenNext sans service de production non implemente.
- **Bloquant isolation** : bucket et configuration Base/secrets/IAM distants non verifies.
- **Bloquant reproductibilite** : population R2 de la Preview a integrer sans selectionner le bucket racine.
- **Validation distante absente** : aucune URL ni publication executee pour cette preparation.

Le rapport CLOUDFLARE-DEPLOYMENT.md precedent decrit le correctif du deploiement actif et ses validations locales. Le present rapport precise les limites supplementaires du workflow Worker Previews : ne pas reutiliser son deploy:cloudflare pour le premier Preview.

## Controle final des fichiers

Trois fichiers seulement changent : wrangler.jsonc, scripts/check-cloudflare.mjs et ce rapport. Le controle structurel confirme que tous les champs racine de production sont identiques au commit 539708c. git diff --check reussit ; scan des 157 chemins suivis ou nouveaux non ignores : aucune detection de secret. Aucun environnement RESEND/UPSTASH/KV_REST/CLOUDFLARE/CONTACT configure dans le processus de controle. Les exemples env ne sont pas des configurations effectives. main reste 26e5de2aac1a20be225411d18a86b3a05897f883. Les modifications de preparation restent locales, non commitees et non poussees.
