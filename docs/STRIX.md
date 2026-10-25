# Audits de sécurité avec Strix

Strix est un outil de développement séparé de l'application Next.js.
Le binaire officiel **1.7.0** est installé dans `.tools/strix/`, ignoré par Git.
L'installateur vérifie la somme SHA-256 publiée pour cette version.

## Installation

Node.js 22.9+ (pour `util.parseEnv`), `curl` et `tar` sont nécessaires.
L'installateur prend en charge Linux et macOS, x64 et ARM64.

```sh
npm run security:install
cp .env.strix.example .env.strix
```

Installer et démarrer [Docker Engine](https://docs.docker.com/engine/install/ubuntu/)
ou [Docker Desktop](https://docs.docker.com/get-started/get-docker/).
`docker info` doit réussir avec le compte qui lance Strix.

Renseigner `STRIX_LLM` et `LLM_API_KEY` dans `.env.strix`, selon le
[fournisseur choisi](https://docs.strix.ai). Les variables déjà présentes dans
le terminal ont priorité. `.env.strix` est ignoré par Git ; sa clé reste locale.
Le code examiné et le contexte d'audit sont traités par le fournisseur IA choisi,
avec les frais d'API correspondants. Le premier audit télécharge l'image Docker.

## Utilisation

```sh
npm run security:check
npm run security:strix -- --version
npm run security:strix -- --help
npm run security:scan
```

`security:check` vérifie les prérequis sans lancer d'audit ni appeler l'IA.
`security:scan` copie les sources dans `.tools/strix/workspaces/`, puis lance
un audit rapide de cette copie avec les instructions de
[STRIX-SCOPE.md](./STRIX-SCOPE.md). Les modifications locales sont incluses ;
les fichiers ignorés par Git, les fichiers `.env*`, les liens symboliques et
les répertoires locaux de configuration sont exclus. Le dossier original
n'est pas monté dans le conteneur. Les copies sont conservées pour consulter
les éventuelles modifications proposées par Strix.
Cette commande ne cible pas automatiquement le site déployé.
Ces instructions définissent le périmètre de l'agent ; elles ne constituent pas
un contrôle réseau. Utiliser une configuration de développement sans secrets
de production pour les tests dynamiques.

Les rapports sont enregistrés dans `strix_runs/`, ignoré par Git.
Pour les consulter : `npm run security:strix -- view`.
Les options avancées du CLI sont accessibles via `security:strix`.

Aucun audit n'est déclenché lors du démarrage ou de la compilation du site.

## GitHub Actions

Le workflow [Strix security audit](https://github.com/nomad403/My-website/actions/workflows/strix.yml), défini dans
`.github/workflows/strix.yml`, s'exécute à chaque push sur `main`, sur les pull
requests internes vers `main`, et manuellement depuis l'onglet Actions.
Docker est fourni par le runner GitHub ; son installation locale n'est pas
nécessaire pour ces audits.

Dans **Settings → Secrets and variables → Actions** du dépôt, ajouter :

- La variable `STRIX_LLM` : identifiant `fournisseur/modèle` choisi.
- Le secret `LLM_API_KEY` : clé API du fournisseur, à saisir dans GitHub.
- Facultativement, la variable `LLM_API_BASE` pour un point d'accès personnalisé.

Pour compatibilité, `STRIX_LLM` peut aussi être un secret si la variable n'est
pas définie. Le workflow échoue avec un message explicite lorsque la configuration
IA est absente. Il ne présente pas un audit non exécuté comme un succès.
Les PR de forks et les événements Dependabot sont exclus de cet audit avec clé API.

L'audit porte sur le code extrait sur le runner, en mode rapide et sans interface,
avec un budget Strix de 5 USD et 100 tours maximum par agent, et une durée du job
limitée à 45 minutes. Le budget est suivi par Strix à partir des coûts estimés ;
ce n'est pas un plafond de facturation imposé au fournisseur.
Le job échoue lorsqu'une vulnérabilité est signalée ou si l'audit rencontre
une erreur. Les rapports disponibles sont conservés en artefacts pendant 7 jours,
y compris après un échec ; les historiques complets des agents ne sont pas publiés.
Le workflow n'envoie aucun secret applicatif de production au runner.

Un échec apparaît dans les checks de la PR. Pour empêcher une fusion malgré cet
échec, sélectionner **Strix audit** comme contrôle obligatoire dans les règles
de protection de `main` ; le workflow seul ne modifie pas ces règles.

Sources : [dépôt officiel](https://github.com/usestrix/strix),
[version installée](https://github.com/usestrix/strix/releases/tag/v1.7.0).
