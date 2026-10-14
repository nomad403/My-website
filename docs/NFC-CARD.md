# Carte de visite NFC NOMAD403

## V1

`/card` est une page statique Next.js, sans authentification, formulaire ni
service externe. Elle utilise les polices, le logo et la palette du portfolio.
Les coordonnées se modifient dans `lib/card/profile.ts`. Les profils LinkedIn et
GitHub reprennent les liens de `components/chrome/SiteSocialFooter.tsx`.

Actions : contacts, email, téléphone, portfolio, partage natif, copie du lien et
copie manuelle si le presse-papiers est indisponible. Le QR est affichable avec
un élément `details` accessible au clavier, et téléchargeable en SVG.

`/glenn-richard.vcf` est une route statique retournant une vCard 3.0 UTF-8, avec
CRLF, échappement et pliage des lignes. Le nom de famille et le prénom sont
structurés séparément. L'utilisateur confirme l'import dans son application de
contacts ; aucun enregistrement silencieux n'est effectué.

`/card/qr.svg` est généré localement au build avec `qrcode`, noir sur blanc,
correction M et marge de quatre modules. Il encode uniquement l'URL de la carte.
La bibliothèque ne fait pas partie du JavaScript client de la carte.

Le layout client contourne les effets et le panneau d'expérience sur `/card`.
Les anciennes balises Open Graph/Twitter du root layout passent par l'API
Metadata de Next.js pour permettre la surcharge propre de la nouvelle page.
La configuration de déploiement est inchangée ; la redirection existante du
domaine sans `www` vers `www` conserve le chemin `/card`.
Le canonical utilise donc `https://www.nomad403.com/card` ; le QR et la puce
conservent l'URL demandée `https://nomad403.com/card`. Le sitemap contient la
page, sans indexer les fichiers VCF/SVG comme des pages web.

## Vérifications

Fichiers créés :

- `app/card/page.tsx`, `app/card/card.module.css`, `app/card/qr.svg/route.ts`
- `app/glenn-richard.vcf/route.ts`
- `components/card/ShareCard.tsx`
- `lib/card/profile.ts`, `lib/card/vcard.ts`
- `scripts/card-audit.mjs`, `docs/NFC-CARD.md`

Fichiers modifiés : `app/layout.tsx`, `components/chrome/ClientLayout.tsx`,
`package.json`, `package-lock.json`, `next-sitemap.config.js` et le sitemap
généré `public/sitemap-0.xml`. Les autres modifications locales préexistantes
ne font pas partie de cette fonctionnalité.

```sh
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
# Dans un autre terminal :
AUDIT_URL=http://127.0.0.1:3100 node scripts/card-audit.mjs
```

Le script contrôle la vCard, l'échappement et les lignes UTF-8, décode réellement
le QR avec `jsqr`, puis vérifie le responsive, le clavier, les métadonnées et
les branches du partage avec Playwright. `jsqr` est uniquement une dépendance
de développement ; `sharp`, déjà livré avec Next.js, rasterise le SVG de test.

Le script `npm run lint` existant lance un assistant de configuration, car le
projet ne possède ni configuration ESLint ni dépendance ESLint installée. Aucun
lint automatique n’est donc disponible. Le typecheck et le build sont exécutés.

À vérifier sur appareils physiques avant diffusion de la carte : import vCard
dans Contacts via Safari iOS/Chrome Android, partage natif et annulation, appels
et emails, lecture NFC, scan du QR sur un autre écran, safe areas et navigation
depuis les navigateurs intégrés. L'émulation Chrome ne valide pas ces parcours
système ni la lecture d'une puce physique.

## Programmer la carte physique

Après déploiement et vérification de la page publique, écrire un unique
enregistrement NDEF de type URI avec : **https://nomad403.com/card**.
Ne pas inscrire les coordonnées ni l'URL du fichier VCF sur la puce. La page
peut ainsi évoluer sans reprogrammer la carte. Tester la lecture sur un iPhone
et un téléphone Android compatibles avant de distribuer la carte.

Références : [vCard 3.0, RFC 2426](https://www.rfc-editor.org/rfc/rfc2426),
[générateur QR local](https://github.com/soldair/node-qrcode).
