# Capture mode haute densité

## Principe

Une capture 1080 × 1920 n'est pas un viewport CSS 1080 × 1920. Le mode
capture conserve le vrai viewport mobile **360 × 640 CSS px**, puis le navigateur
augmente uniquement sa densité : DPR 3 produit 1080 × 1920 pixels, DPR 4 produit
1440 × 2560 et DPR 6 produit 2160 × 3840. Les media queries, `vw`, `vh`,
`clamp()`, `ResizeObserver` et les mesures DOM continuent donc de voir 360 × 640.

L'ancienne iframe 1080 × 1920 et son `transform: scale()` ont été supprimés :
elles faisaient croire au site qu'il était desktop et causaient les écarts de
typographie. `?capture=1` reste uniquement destiné aux adaptations techniques :
l'écran d'entrée audio est masqué et le canvas WebGL peut utiliser le DPR du
navigateur, plafonné à 3 pour préserver la VRAM. Le PNG final, les polices et le
DOM restent bien rendus à DPR 6 ; seul le renderer décoratif externe est plafonné.

## Presets et captures

Lance le serveur (`npm run dev`), puis dans un autre terminal :

```bash
npm run capture -- --preset=1080 --route=/
npm run capture -- --preset=1440 --route=/projects
npm run capture -- --preset=4k --route=/
npm run capture -- --preset=1080 --route=/ --validate
```

Les PNG et les mesures CSS sont écrits dans `artifacts/captures/`. Le script
ouvre Chrome via Playwright, utilise toujours un viewport 360 × 640 et ajoute
automatiquement `?capture=1`. `--validate` compare les géométries CSS des
presets 1080, 1440 et 4k.

## Test manuel dans Chrome

Dans Device Toolbar, crée un appareil personnalisé : largeur **360**, hauteur
**640**, DPR **3** (ou 4, 6). Entrer directement 1080 × 1920 avec DPR 1 est un
autre contexte CSS : le site voit 1080 px et ses règles responsive changent.

## Capture desktop verticale dans DevTools

Pour conserver le menu desktop et les interactions souris en format vertical,
utilise un viewport CSS **1080 × 1920** ou **2160 × 3840** avec DPR **1**.
Le layout mobile dépend uniquement de la largeur (moins de 768 px), jamais
de l'orientation ou du ratio.

Dans Device Toolbar, sélectionne le type **Desktop** : l'émulation tactile
(`pointer: coarse`) masque le cross cursor et active le comportement mobile
des sphères. Avec le type Desktop, le cross cursor et le suivi souris des
sphères restent actifs. Recharge la page après avoir changé le type d'appareil.
Utilise la page normale pour le suivi souris ; `/demo` pilote les sphères avec
sa trajectoire automatique. `?capture=1` permet de masquer l'entrée audio.

## OBS

Les screenshots Playwright sont des bitmaps haute densité fiables. Une fenêtre
Chrome visible capturée par OBS reste limitée par la résolution et le scaling du
moniteur/OS : son DPR ne garantit pas une fenêtre 4K réelle. Pour une vidéo 4K,
utilise une sortie/écran 4K ou capture à une résolution OBS 2160 × 3840 ;
`npm run capture:browser -- --preset=4k --route=/` lance le même contexte pour
prévisualisation, mais ne contourne pas cette limite matérielle.
