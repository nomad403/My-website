# NOMAD403 ? Previews natives Cloudflare / OpenNext

Audit du 12 novembre 2026. Depot nomad403/My-website, worktree My-website-cloudflare, branche fix/cloudflare-worker-self-reference.
Base locale : 82039427af20862b2b060cc7c50ee218fdd5b04f.
Statut : **Preview fonctionnelle verifiee ; NO-GO pour affirmer une automatisation GitHub complete.**

## Etat reel et preservation

Au debut de cet audit, le working tree etait propre : l'hypothese de modifications Preview encore non commitees ne correspondait plus au depot.
main distant : 82039427af20862b2b060cc7c50ee218fdd5b04f.
Branche de correction distante : 539708cd4201d8c19099c2bcb9291449fe347c52.
Corrections commitees et poussees uniquement sur fix/cloudflare-worker-self-reference : cb9515989371c8fea8ceb3d4b7cfcce1afddef41. main reste a 82039427af20862b2b060cc7c50ee218fdd5b04f.

wrangler.jsonc et open-next.config.ts sont conserves inchanges. Les bindings, flags, routes et variables de production ne sont pas modifies. Le fetch de production du custom Worker est transmis directement a OpenNext, avec ses arguments d'origine. Aucun deuxieme Worker permanent, aucune branche staging, aucun Lot Shop, aucune action DNS ou Vercel.

## Audit distant execute

La session Wrangler expiree a ete renouvelee par le proprietaire. Les lectures authentifiees confirment :
- compte Cloudflare attendu, Worker my-website existant ;
- Previews Base vide : aucun secret ni binding importe depuis la production ;
- une ressource Preview fix/cloudflare-worker-self-reference existe, mais n'a aucun deploiement ;
- le bucket etait initialement absent (API R2, code 10006) ; apres autorisation explicite du proprietaire, il a ete cree le 12 novembre 2026, stockage Standard, localisation WEUR ;
- lecture des triggers Builds refusee par cette connexion OAuth : HTTP 403 / code 10000.

Les captures precedentes et le contexte fourni par le proprietaire indiquent main en production et les builds Preview actives. La commande Preview et les droits du token Builds doivent encore etre confirmes dans le dashboard ; aucune valeur de token n'est demandee ou affichee. Le refus API Builds est un manque de droits de lecture, pas une verification reussie.

## Integration locale preparee

### Auto-reference sans production

cloudflare/worker.mjs exporte PreviewSelfReference, un WorkerEntrypoint. Pour NOMAD403_ENV=preview, cloudflare/preview-env.mjs fournit a OpenNext un env limite et remplace WORKER_SELF_REFERENCE par ctx.exports.PreviewSelfReference. Les appels imbriques restent dans le meme code Preview, sans service vers my-website actif et sans fetch vers un hostname de production.

Le guard exige un cache Preview, un prefixe valide et un loopback disponible ; sinon il renvoie 503, sans fallback. Les secrets et bindings hors liste autorisee ne sont pas transmis au handler Preview.

Il s'agit d'une composition des API officielles Custom Worker OpenNext et ctx.exports Cloudflare, pas d'une modification du SDK ou d'un desactivage de validation. OpenNext 1.20.16 ne fournit pas lui-meme un workflow complet Worker Previews : l'orchestration reste explicite et testee dans ce depot.

La page Context mentionne encore un flag explicite, mais la page Compatibility flags et le runtime workerd confirment que ctx.exports est active par defaut depuis le 17 novembre 2025. La date existante 2026-11-10 suffit. Aucun flag supplementaire ni changement de date n'est donc ajoute.
Sources : [Custom Worker OpenNext](https://opennext.js.org/cloudflare/howtos/custom-worker), [ctx.exports](https://developers.cloudflare.com/workers/runtime-apis/context/), [compatibilite](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-ctxexports).

### Cache R2 Preview et initialisation

scripts/preview-config.mjs produit deux configurations temporaires ignorees :
1. Native : meme Worker my-website, parametres Preview issus du bloc previews, avec prefixe dynamique.
2. Cache : uniquement le R2 Preview et ses variables, sans DO, Images, assets, service ou ressource de production.

Cible R2 autorisee, creee et verifiee : nomad403-preview-opennext-cache.
Prefixe : preview/<empreinte de branche sur 12 caracteres>/<BUILD_ID Next>.
Le prefixe utilise pour la population et celui fourni au runtime sont identiques ; des branches ou builds differents ne se melangent pas dans le fonctionnement normal. Le bucket partage reste une separation logique entre Previews, pas une frontiere de confidentialite contre du code de branche malveillant. Il est distinct du bucket de production.

La commande preparee npm run publish:preview effectue les controles en lecture seule AVANT toute mutation, puis :
- populateCache remote avec la CLI officielle OpenNext et la configuration CACHE Preview uniquement ;
- nouvelle verification des ressources ;
- wrangler preview --ignore-base-config avec la configuration native generee, le nom de branche et le SHA comme tag/message.

Le helper OpenNext peut provisionner un bucket absent ; notre preflight refuse donc un bucket manquant avant d'appeler le helper. La premiere creation doit etre explicitement autorisee et effectuee separement. Ne jamais lancer populateCache remote avec wrangler.jsonc racine : il selectionnerait le cache de production.
Source : [CLI OpenNext](https://opennext.js.org/cloudflare/cli).

### Bindings et donnees

| Binding | Cible effective en Preview |
| --- | --- |
| WORKER_SELF_REFERENCE | ctx.exports.PreviewSelfReference ; aucun service externe |
| NEXT_INC_CACHE_R2_BUCKET | nomad403-preview-opennext-cache, cree apres accord |
| NEXT_INC_CACHE_R2_PREFIX | prefixe de branche et build, genere |
| ASSETS | assets du build de cette branche |
| IMAGES | API de transformation du compte, aucun stockage d'images de production cible |
| CONTACT_LIMITER | namespace Durable Object propre a la Preview, classe ContactLimiter |
| NOMAD403_ENV | preview |
| Resend, Redis, Stripe, base de donnees | Aucun binding/secret autorise |

Les Previews natives isolent automatiquement les namespaces Durable Objects. Le preflight refuse un namespace CONTACT_LIMITER identique a celui de production ou une reference a un autre script.
Les services externes restent interdits dans le bloc Preview. Les ressources R2 necessitent leur propre bucket ; elles ne sont pas clonees automatiquement.
Sources : [configuration Preview](https://developers.cloudflare.com/workers/previews/configuration/), [ressources et isolation](https://developers.cloudflare.com/workers/previews/resources/).

### Variables, secrets et publication

scripts/check-preview-build.mjs refuse les variables applicatives mail/Stripe/Redis/base/auth dans un build Preview, ainsi que les fichiers env locaux non exemples. Le token CI Cloudflare reste une credential du pipeline, jamais une variable runtime de l'application. Ses droits doivent etre limites aux operations necessaires ; le partage d'un token de production trop privilegie avec des branches non fiables n'est pas une isolation des droits CI.

scripts/preview-remote.mjs expose seulement des requetes GET pour les audits. Il utilise l'authentification locale Wrangler ou le token CI sans les afficher :
- refuse une Base distante non vide ;
- confirme le bucket Preview et son absence des bindings R2 de production ;
- compare les namespaces DO via leurs metadonnees, sans lire de donnees applicatives ;
- refuse les secrets, services et bindings inattendus d'un ancien deploiement Preview.

La commande npm run audit:preview realise ce preflight sans aucune ecriture distante.
Le formulaire est toujours ferme en Preview, meme si des credentials mail lui sont fournies par erreur. Aucun e-mail reel n'a ete envoye pendant cette tache.

## Commandes Builds a utiliser

Uniquement dans Settings > Builds > Previews Base :
- Build : npm run build:cloudflare (npm run build reste compatible avec WORKERS_CI=1).
- Preview : npm run publish:preview.
- Racine : /.
- Production branch : main, a conserver.

La commande brute npx wrangler preview ne suffit pas a initialiser le cache OpenNext ni a appliquer notre preflight. La remplacer UNIQUEMENT dans le champ Preview, pas dans le champ Deploy de Production.
Le proprietaire a confirme avoir configure ces deux commandes dans Previews Base et conserve main en production. Aucun parametre de production n'a ete modifie par l'agent. La lecture independante des triggers reste refusee par l'API.

## Controles executes

| Controle | Resultat |
| --- | --- |
| Wrangler parseur et configurations generees | Reussis |
| TypeScript | Reussi |
| npm run build avec WORKERS_CI=1 et branche Preview | Next et OpenNext reussis |
| Suite securite et Preview | 48 tests, 47 reussis, 1 Redis externe ignore, 0 echec |
| Test ignore | Compatibilite Vercel/Redis uniquement ; non revendique comme execute |
| Loopback workerd | Appels simples et imbriques, aucune sortie reseau ni service de production |
| Parcours production, fixture workerd | Arguments/env d'origine preserves |
| Initialisation cache CLI OpenNext locale | 6 entrees peuplees dans le cache Preview local |
| Wrangler dry-run runtime Preview | R2 Preview, DO, Images, Assets ; aucun service de production |
| Bundle OpenNext reel | /, /card, /projects, /specialist, /signature : HTTP 200 |
| Revalidation via loopback du vrai bundle | HTTP 200, x-nextjs-cache: REVALIDATED |
| R2 du vrai bundle | Entrees ecrites sous le prefixe Preview, aucune ressource distante |
| Formulaire du vrai bundle Preview | HTTP 503 attendu, aucun e-mail |
| Sentinelles de sortie du test complet | 0 appel au service de production, 0 requete reseau externe |
| Preflight distant | A d'abord refuse le bucket absent ; apres creation autorisee, reussi : bucket Preview verifie, Base vide, aucune ressource partagee avec la production |
| Git, secrets et audit npm | Controles finaux dans le compte rendu ci-dessous |

Le test complet utilise un probe local ignore pour appeler le vrai WorkerEntrypoint de revalidation et le vrai handler OpenNext. Ce probe et le token de revalidation genere ne sont pas livres au site. Les tests du Pages Router res.revalidate ne sont pas revendiques : cette application n'expose pas ce chemin ; le HEAD de revalidation du runtime App Router a ete effectivement execute.

Les epreuves sont conservees dans .cloudflare-review/native-preview-*.log, les configurations generees et le harnais local ignores. Les audits visuels exhaustifs des versions precedentes ne sont pas comptes comme reexecutes. Aucun composant graphique ou media n'est modifie.

## Conditions avant commit et push

1. Autorisation de creer le seul bucket nomad403-preview-opennext-cache et de l'initialiser avec des donnees de build Preview.
2. Creation puis verification authentifiee : bucket distinct de toute cible de production.
3. Regler et confirmer les commandes Previews Base ci-dessus, les builds Preview actives et main toujours branche de production. Verifier les droits du token Builds ; ne pas transmettre sa valeur.
4. npm run audit:preview doit reussir avec les ressources distantes reelles.
5. Commit sur fix/cloudflare-worker-self-reference seulement, puis push de cette branche seulement.
6. Verifier le check Workers Builds du SHA, les metadonnees du deploiement Preview, l'URL fournie et les bindings effectifs. Tester les routes/assets et l'absence d'e-mail ; ne pas declarer GO sur un simple build ou une URL creee avec des avertissements.

Le premier deploiement natif creera ses ressources Preview, notamment son namespace DO. Aucun deuxieme Worker permanent ne sera cree. Le helper cache utilise le mecanisme temporaire officiel OpenNext, sans Worker staging permanent.
Le bucket peut consommer du stockage/des operations R2 ; aucune promesse de gratuite ni changement de plan n'est fait.

## Etat de livraison

Autorisations obtenues : creation/initialisation du bucket Preview ; configuration des commandes Previews Base confirmee par le proprietaire, main conservee en production. Preflight distant reussi. Publication realisee uniquement sur fix/cloudflare-worker-self-reference. Voir ci-dessous la distinction entre build automatique initial incomplet et publication native fonctionnelle executee directement.

Controles finaux : git diff --check reussi ; scan de 170 chemins suivis ou nouveaux sans detection de secret ; audit npm du 12 novembre : 0 vulnerabilite connue. wrangler.jsonc et open-next.config.ts inchanges.

## Verification distante effective

Commit publie : cb9515989371c8fea8ceb3d4b7cfcce1afddef41.
URL native : https://fix-cloudflare-worker-self-reference-my-website.glennrichard-dev.workers.dev

Le build automatique dbcb24ee-f90b-4dab-aa6e-69191644dc01 a ete declare reussi par Cloudflare, mais son deploiement 66ba2231-9ebb-4e3f-8022-4427422f3f0d ne contenait pas NEXT_INC_CACHE_R2_PREFIX : les pages serveur repondaient 503, les assets 200. Ses annotations etaient le titre Git et le SHA court, contrairement aux arguments de notre publisher. Le journal fourni par le proprietaire confirme la cause : Executing user deploy command: npx wrangler preview. La commande npm run publish:preview n'a donc pas ete executee ; initialisation du cache et prefixe dynamique etaient absents.

La commande npm run publish:preview a ensuite ete executee directement avec le code et les artefacts verifies du commit cb95159. Elle a peuple six entrees dans le seul bucket Preview et cree le deploiement natif ce713a39-8255-4511-a423-2e21c48166ac. Son tag est le SHA complet cb9515989371c8fea8ceb3d4b7cfcce1afddef41 et son message est Preview commit suivi de ce SHA. Prefixe effectif : preview/ef987f88ba2c/43ZfjW8WQZYUswswcun_T.

Controles apres cette publication :
- /, /contact, /projects, /specialist, /card et /signature : HTTP 200 ; police ProFont : 200 ; /shop : 404 attendu.
- HEAD de revalidation /card : HTTP 200, x-nextjs-cache REVALIDATED.
- POST valide de controle Preview : HTTP 503 attendu, aucune credential Resend dans le deploiement, aucun envoi de mail.
- Metadonnees : bucket R2 Preview confirme, namespace CONTACT_LIMITER distinct de production, aucun secret, aucun service WORKER_SELF_REFERENCE distant.
- Navigateur Chrome distant : 6 pages aux largeurs 1440 et 390, FR/EN, WebGL actif, polices chargees, 8 captures, 0 erreur et 0 echec de requete. Le navigateur n'autorise que le domaine Preview et les lectures du CDN public jsDelivr ; les appels a la production sont bloques.
- BUILD_ID Preview : 43ZfjW8WQZYUswswcun_T. Identifiant statique de production inchange : ZBltsk6rmvODQ5EsZw4Po.
- Le helper open-next-cache-populate n'apparait pas parmi les Workers permanents du compte.

Ces resultats valident la version Preview publiee par notre commande. Ils ne prouvent pas encore que chaque push de branche executera correctement cette commande. Ne pas relancer de push uniquement pour contourner ce constat : corriger et enregistrer d'abord Preview command = npm run publish:preview dans Previews Base, puis verifier un nouveau build automatique. Aucune mise a jour de main, aucun deploiement de production, aucun DNS ni parametre Vercel modifie.

Le present complement de rapport reste local en attente de la correction du champ Preview command confirme errone par le journal ; le code de correction est deja publie au commit indique.
