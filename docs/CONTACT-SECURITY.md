# Protection du formulaire de contact

## Activation avant déploiement

Créer une base Redis durable dans [Upstash](https://console.upstash.com/), ou via
l'intégration Redis de l'hébergeur. Ajouter dans les variables d'environnement
**serveur** du projet Vercel, pour les environnements concernés :

- `UPSTASH_REDIS_REST_URL` : URL HTTPS REST de la base.
- `UPSTASH_REDIS_REST_TOKEN` : jeton REST en lecture/écriture.

Les noms `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont également reconnus.
Conserver les variables Resend existantes. Ne jamais préfixer ces secrets par
`NEXT_PUBLIC_`, les publier dans Git ou les ajouter aux secrets du pentest.
Redéployer après leur ajout. Le fichier `.env.contact.example` liste les variables
nécessaires ; les fichiers contenant les valeurs réelles restent ignorés par Git.

**Sans Redis configuré et accessible, `/api/contact` répond 503 et aucun mail
n'est envoyé. Préparer les variables avant de fusionner/déployer ce correctif.**

## Limites appliquées avant chaque envoi

- 3 messages maximum par client sur une fenêtre de 10 minutes.
- 20 messages par heure et 50 par jour pour chaque client.
- Même client, même contact et même message : un seul envoi sur 10 minutes.

Tous les compteurs sont propres au client. L'épuisement du quota d'un visiteur
n'entraîne pas le refus des messages des autres visiteurs.

Une commande Redis Lua atomique vérifie et réserve tous les quotas ensemble,
y compris lors d'envois simultanés depuis plusieurs instances. Les fenêtres
commencent à la première réservation et expirent automatiquement. Les tentatives
refusées ne prolongent pas les fenêtres. Un échec Resend consomme la réservation
pour empêcher les rafales de nouvelles tentatives. Les valeurs des limites sont
définies dans `lib/contact/contact-abuse.ts`.

Sur Vercel, seule l'adresse du header `x-vercel-forwarded-for` fourni par la
plateforme est utilisée ; les headers arbitraires envoyés par le client sont
ignorés. Hors Vercel, définir `CONTACT_TRUSTED_IP_HEADER` uniquement pour un
header écrasé par votre reverse proxy de confiance, par exemple `x-real-ip`.
Le serveur applicatif doit être inaccessible en contournant ce proxy. Sans
adresse IP valide provenant du proxy configuré, l'envoi est refusé avec 503 ;
aucun quota commun de repli n'est utilisé. Les clés utilisent des HMAC ; ni les
adresses IP ni le texte des messages ne sont enregistrés dans Redis.

Un dépassement ou un doublon renvoie `429` avec `Retry-After`. Une panne Redis
ou une réponse invalide interrompt l'envoi avec `503`, sans repli sur un compteur
en mémoire. Un champ piège filtre les robots simples ; il ne remplace pas les
quotas et ne prétend pas bloquer tous les robots. Les quotas par client ne
constituent pas un plafond de facturation global : une attaque distribuée sur
de nombreuses adresses nécessite une protection complémentaire chez l'hébergeur
ou un CAPTCHA. Surveiller l'usage Resend. Aucun système d'alerte externe n'est connecté.

Les corps JSON sont limités à 8 Kio, même sans Content-Length ; les origines
différentes sont refusées pour les requêtes de navigateur. Les détails internes
de Resend et les exceptions ne sont plus renvoyés au visiteur.

## Validation

`npm run test:security` vérifie le handler avec un fournisseur mail simulé,
notamment les refus sans envoi et l'absence de divulgation d'erreurs internes.
Le workflow de tests ne reçoit aucune clé Resend réelle. Le pentest Strix doit
être relancé après les changements ; sa portée reste une instance isolée.
Le workflow de régression démarre un Redis local éphémère pour tester le script
Lua réel (concurrence, isolation des visiteurs, doublons et expiration). Pour lancer aussi
ce test en local, démarrer Redis et définir `REDIS_TEST_PORT` avant la commande.

Références : [API REST Upstash](https://upstash.com/docs/redis/features/restapi),
[headers Vercel](https://vercel.com/docs/headers/request-headers).
