# Formulaire : antispam natif Cloudflare

La version Cloudflare du formulaire reserve ses envois dans un Durable Object SQLite, binding CONTACT_LIMITER, classe ContactLimiter. Aucun identifiant Upstash/Redis n'est lu sur ce parcours. Resend reste le fournisseur d'e-mail.

## Configuration et activation

- Runtime Production : RESEND_API_KEY (secret), RESEND_FROM, RESEND_TO.
- wrangler.jsonc declare CONTACT_LIMITER et exports.ContactLimiter (type durable-object, storage sqlite).
- Le premier deploiement de cette declaration provisionne le namespace ; ne pas creer manuellement un namespace d'un autre nom.
- Le Worker d'entree cloudflare/worker.mjs conserve le fetch OpenNext et exporte la classe ContactLimiter.
- keep_vars=true preserve les variables runtime saisies dans le dashboard lors des prochains deploiements. Les secrets Resend ne sont ni lus par l'audit ni commites.
- Les commandes Workers Builds existantes npm run build / npx wrangler deploy restent prises en charge. Le premier deploiement cree la ressource SQLite demandee et sa consommation releve des quotas/tarifs du compte Cloudflare ; aucun changement d'abonnement n'est effectue.
- Conserver Resend comme avant avec un domaine d'expedition verifie. Les anciens secrets Upstash peuvent rester en place pendant la verification : le chemin Cloudflare ne les utilise plus. Leur suppression distante n'est pas automatisee.

Le chemin Vercel conserve sa protection Redis existante pour ne pas changer son fonctionnement. Les variables UPSTASH_REDIS_REST_* ou KV_REST_API_* restent donc pertinentes exclusivement pour ce chemin.

## Protection conservee

Par adresse cliente : 3 reservations / 10 minutes, 20 / heure, 50 / jour ; doublon contact/message bloque 10 minutes pour cette adresse. Fenetres fixes demarrant a la premiere reservation, comme la version Redis precedente. Chaque controle et ses mises a jour se deroulent dans une transaction SQLite synchrone, sans await intermediaire. Les demandes bloquees n'incrementent aucun compteur.

Un objet deterministe par environnement coordonne les reservations. Son sel aleatoire persistant permet de hacher les identifiants clients et doublons ; ni IP, ni adresse de contact, ni message ne sont stockes en clair. Un nettoyage borne des lignes expirees se fait lors des demandes, sans boucle d'alarmes. La restauration/PITR du fournisseur peut conserver des sauvegardes de donnees deja expirees selon les regles Cloudflare.

Une reservation est consommee avant l'appel Resend et reste consommee si le fournisseur echoue, comme auparavant. Cette protection contre les doublons n'est pas une garantie d'exactement-un-e-mail en cas de panne externe ou de nouvelle demande apres expiration. Aucun retry applicatif automatique n'est ajoute.

La verification de l'IP exige le contexte OpenNext et le binding CONTACT_LIMITER avant de lire CF-Connecting-IP. Aucun header seul, aucun fallback d'IP partage, aucun acces au Worker de production via WORKER_SELF_REFERENCE n'est requis pour l'antispam. Le self binding OpenNext reste configure pour ses autres usages. Un flag VERCEL herite ne prend pas priorite sur un contexte Cloudflare reel.

## Preview et isolation

Le binding de classe est aussi declare sous previews.durable_objects. Les Worker Previews Cloudflare possedent des namespaces DO distincts, et le nom d'objet inclut egalement l'environnement. Le code refuse explicitement l'envoi d'e-mails si NOMAD403_ENV=preview, meme en cas de secrets mail fournis par erreur. Les problemes de cache R2 et self reference du Preview OpenNext documentes dans CLOUDFLARE-PREVIEWS.md ne sont pas declares resolus par ce changement : pas de GO Preview distant.

## Diagnostics sans secrets

Les erreurs restent des 503 generiques pour le navigateur. Les journaux n'ajoutent qu'un code fixe :
- client_identity_unavailable : contexte, binding ou IP non fiables ;
- durable_object_unavailable : appel du binding absent, refuse ou en erreur ;
- durable_object_response_invalid : reponse interne non conforme ;
- preview_mail_disabled : envoi bloque pour Preview ;
- redis_* : diagnostics du parcours Vercel conserve.

Ne jamais journaliser les erreurs brutes du fournisseur, le token, la cle API, les corps du formulaire ou une URL de connexion.

## Validation locale

La suite npm run test:security execute les tests du vrai handler TypeScript et des tests workerd/SQLite locaux : demandes concurrentes, doublons, isolation des clients et environnements, plafonds, expiration, atomicite d'un refus et persistance apres redemarrage. Le harnais d'horloge et d'inspection dans tests/fixtures n'est pas exporte par le Worker deploye.

Le test Redis externe reste ignore localement si REDIS_TEST_PORT est absent ; ce test concerne uniquement la compatibilite Vercel et ne qualifie pas le backend natif Cloudflare.

Avant de declarer le formulaire fonctionnel : deploiement Cloudflare reussi, binding CONTACT_LIMITER visible, puis une soumission valide explicitement autorisee et confirmation de la reception du mail. Une reponse API 200 prouve l'acceptation par Resend, pas la livraison en boite de reception.

## Retour arriere

Conserver le commit precedent et la derniere version Workers saine. Restaurer une version anterieure peut retablir le parcours Redis ; elle exigera alors ses anciennes variables et une configuration valide. Ne pas supprimer le namespace SQLite lors d'un rollback : sa suppression detruirait l'etat et n'est pas necessaire pour revenir au code precedent. Le changement de backend repart avec des quotas natifs neufs ; les reservations Redis ne sont pas migrees.

## Sources

- [Custom Worker OpenNext](https://opennext.js.org/cloudflare/howtos/custom-worker)
- [Stockage transactionnel Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/)
- [Declaration des classes et provisionnement](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [Isolation des ressources Preview](https://developers.cloudflare.com/workers/previews/resources/)

## Resultats de cette livraison

Installation npm ci reussie : 421 packages installes, 422 audites, 0 vulnerabilite connue. TypeScript et build Workers CI/OpenNext reussis. Suite de securite : 44 tests, 43 reussis, 1 Redis externe ignore, 0 echec. Dry-run Wrangler reussi avec CONTACT_LIMITER (ContactLimiter). Preview locale : routes publiques et police testees en HTTP 200 ; contact sans configuration mail ferme en 503. Test du bundle complet dans workerd avec le vrai SQLite : 20 demandes concurrentes, 3 HTTP 200 et 17 HTTP 429, trois appels Resend simules et aucun e-mail reel. Ce test API local ne fournit pas de header Origin ; les verifications de rejet d'origine et de contenu restent couvertes par les tests du handler et ne sont pas modifiees.
