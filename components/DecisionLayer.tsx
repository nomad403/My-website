"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import ShuffleText from "./ShuffleText"

interface Category {
  id: number
  label: string
  questions: {
    index: string
    question: string
    answer?: string
    microText?: string
  }[]
}

const categories: Category[] = [
  {
    id: 1,
    label: "Le contexte avant la solution",
    questions: [
      {
        index: "01",
        question: "Pourquoi un site web n’est jamais le véritable point de départ",
        answer:
          "Un projet de site web est presque toujours la conséquence visible d’un changement plus profond. Il peut s’agir d’une évolution de l’activité, d’un repositionnement, d’une croissance mal accompagnée ou, au contraire, d’un ralentissement qui interroge. Le site devient alors le support sur lequel se concentrent des attentes multiples : visibilité, crédibilité, clarté ou performance commerciale.\n\nConsidérer le site comme le point de départ conduit souvent à des décisions trop rapides, prises sans compréhension fine du contexte. Cette approche génère fréquemment des surcoûts cachés : refontes précoces, fonctionnalités inutilisées, ou architectures techniques inadaptées qui limitent l’évolution future.\n\nÀ l’inverse, identifier ce qui a déclenché le besoin permet de distinguer ce qui relève réellement du site de ce qui concerne l’offre, le discours ou l’organisation. Cette distinction conditionne la pertinence de toute décision ultérieure. Par exemple, un manque de visibilité peut provenir d’un problème de référencement, mais aussi d’une offre mal positionnée ou d’un message confus. Traiter uniquement le symptôme technique sans adresser la cause structurelle conduit à des résultats décevants malgré un investissement significatif.\n\nCette analyse préalable nécessite une approche méthodique : cartographier les points de friction, identifier les dépendances entre les différents leviers (technique, contenu, organisation), et évaluer l’impact réel de chaque décision sur l’ensemble du système. C’est ce travail de cadrage qui transforme un besoin flou en projet structuré et réalisable."
      },
      {
        index: "02",
        question: "Dans quels cas un projet numérique devient un enjeu structurant",
        answer:
          "Un projet numérique devient structurant lorsqu’il dépasse la simple question de présence en ligne et commence à engager durablement l’activité. Cela se produit notamment lorsque le site devient un point d’entrée central pour les clients, un support commercial majeur ou le socle d’outils plus larges.\n\nLes indicateurs de structuration sont multiples : le site génère plus de 30% des contacts qualifiés, il devient le principal canal de présentation de l’offre, ou il conditionne directement les processus internes (gestion des commandes, suivi des prospects, automatisation de tâches répétitives). Dans ces contextes, chaque décision technique ou organisationnelle a des répercussions qui dépassent le périmètre initial du projet.\n\nÀ ce stade, les décisions prises influencent non seulement le site, mais aussi la manière dont l’activité se présente, se rend compréhensible et peut évoluer. L’architecture des contenus conditionne la capacité à communiquer efficacement. Les choix techniques déterminent la vitesse d’évolution et les coûts de maintenance. La structure des données impacte la possibilité d’intégrer de futurs outils ou de générer des analyses pertinentes.\n\nCes projets nécessitent donc une approche plus réfléchie, orientée vers la cohérence et les conséquences à moyen terme. Cela implique de modéliser les scénarios d’évolution probables, d’évaluer les dépendances entre les différents composants, et de construire une base solide qui supportera les transformations futures sans nécessiter de refonte complète. L’enjeu n’est plus seulement de livrer un site fonctionnel, mais de créer un système cohérent qui s’intègre durablement dans l’écosystème de l’activité."
      },
      {
        index: "03",
        question: "Quand le site est un symptôme plus qu’un problème",
        answer:
          "Il est fréquent qu’un site perçu comme inefficace reflète en réalité un problème plus profond : message confus, offre mal hiérarchisée ou priorités floues. Ces éléments finissent par se matérialiser dans le site, quel que soit son niveau de finition technique ou esthétique. Un site peut être techniquement irréprochable tout en restant inefficace si les fondations conceptuelles sont fragiles.\n\nLes signaux révélateurs sont nombreux : difficulté à expliquer clairement l’activité, multiplication des pages sans hiérarchie claire, contenus qui se répètent ou se contredisent, ou encore absence de parcours utilisateur cohérent. Ces symptômes indiquent généralement que le problème dépasse le cadre du site lui-même.\n\nDans ces situations, refaire le site sans revoir le cadre global revient à déplacer le problème sans le résoudre. Le site devient alors un symptôme, révélant des incohérences existantes plutôt qu’un véritable levier de transformation. L’investissement technique, aussi important soit-il, ne peut compenser un positionnement flou ou une offre mal structurée.\n\nLa démarche correcte consiste à identifier d’abord les incohérences structurelles : clarifier le positionnement, hiérarchiser l’offre, définir les messages clés, et structurer l’information de manière logique. Ce n’est qu’une fois ce travail de fond réalisé que la création ou la refonte du site peut devenir réellement efficace. Cette approche nécessite un temps d’analyse et de réflexion, mais elle évite les cycles de refontes successives qui coûtent plus cher qu’un cadrage initial solide."
      },
      {
        index: "04",
        question: "Ce que révèlent les projets lancés par nécessité",
        answer:
          "Certains projets sont déclenchés par contrainte : site obsolète, image dégradée, difficulté à être contacté ou à être compris. Ces contextes appellent souvent une réponse rapide, mais pas nécessairement une refonte lourde. La pression temporelle peut conduire à des décisions précipitées qui génèrent des coûts cachés ou des solutions inadaptées.\n\nL’enjeu consiste à distinguer ce qui relève de l’urgence réelle de ce qui peut être différé. Une analyse posée permet d’éviter un surinvestissement dans des solutions inadaptées au contexte et aux objectifs réels. Par exemple, un site obsolète peut nécessiter une mise à jour technique urgente (sécurité, compatibilité), mais la refonte complète peut être planifiée de manière plus sereine une fois les fondations sécurisées.\n\nCette distinction est cruciale car elle permet de séparer l’intervention d’urgence de la stratégie à moyen terme. Une approche en deux temps : d’abord stabiliser et sécuriser, puis construire sur des bases solides. Cette méthode évite de prendre des décisions structurelles sous pression, tout en répondant aux besoins immédiats. Elle nécessite une capacité à évaluer rapidement les risques et les priorités, puis à proposer un plan d’action qui respecte à la fois l’urgence et la qualité à long terme."
      },
      {
        index: "05",
        question: "Pourquoi la question n’est pas « faut-il un site », mais « pour quoi faire »",
        answer:
          "La création ou la refonte d’un site n’est jamais une finalité en soi. La question centrale porte sur son rôle réel : rassurer, clarifier une offre, générer des contacts ou soutenir un processus commercial. Chaque rôle implique des choix structurels, techniques et éditoriaux différents.\n\nUn site orienté « rassurance » privilégie la crédibilité, la transparence et la présentation professionnelle. Un site « génération de contacts » nécessite une architecture de conversion, des appels à l’action stratégiquement placés, et une optimisation du parcours utilisateur. Un site « support commercial » doit intégrer des outils de qualification, de suivi et potentiellement des automatisations.\n\nTant que cette fonction n’est pas clairement définie, le projet reste fragile. Clarifier le rôle du site permet d’orienter les décisions de structure, de contenu et de priorisation, et d’éviter un site qui tente de tout faire sans remplir efficacement aucun objectif. Cette clarification nécessite souvent de hiérarchiser : un site peut avoir plusieurs rôles, mais l’un d’eux doit être prioritaire pour guider les arbitrages.\n\nCette définition du rôle conditionne également les indicateurs de succès : nombre de visites pour un site informatif, taux de conversion pour un site commercial, temps de compréhension pour un site de clarification. Sans objectif clair, il est impossible d’évaluer l’efficacité réelle du projet et d’identifier les axes d’amélioration pertinents."
      },
      {
        index: "06",
        question: "Ce que je cherche à comprendre avant toute recommandation",
        answer:
          "Avant d’envisager une solution, il est essentiel de comprendre le contexte global du projet : objectifs réels, contraintes, ressources disponibles, temporalité et niveau d’exigence attendu. Cette analyse nécessite d’explorer plusieurs dimensions simultanément.\n\nLes objectifs réels doivent être distingués des objectifs affichés : un client peut formuler un besoin de « visibilité » alors que le problème réel est un positionnement flou ou une offre peu différenciée. Les contraintes incluent non seulement le budget, mais aussi les ressources internes, les dépendances organisationnelles, et les limites techniques existantes. Les ressources disponibles concernent le temps, les compétences internes, et la capacité à maintenir le projet dans la durée.\n\nCe travail d’analyse permet de poser un cadre clair et d’éviter des décisions génériques. Il ne vise pas à apporter immédiatement des réponses toutes faites, mais à construire une lecture cohérente des enjeux. Cette phase de cadrage révèle souvent des éléments non exprimés initialement : attentes implicites, contraintes non mentionnées, ou opportunités non identifiées.\n\nLa méthode consiste à croiser les informations, à identifier les incohérences, et à formuler des hypothèses que le projet permettra de valider ou d’infirmer. Cette approche analytique transforme un besoin flou en projet structuré, avec des décisions éclairées et des risques maîtrisés. Elle nécessite du temps et de la rigueur, mais elle évite les ajustements coûteux en cours de route et garantit une meilleure adéquation entre la solution proposée et le contexte réel."
      }
    ]
  },
  {
    id: 2,
    label: "Les décisions qui engagent dans la durée",
    questions: [
      {
        index: "01",
        question: "Quelles décisions sont difficiles à corriger après coup",
        answer:
          "Certaines décisions structurent un projet de manière durable, parfois sans que cela soit immédiatement visible. Organisation des contenus, architecture générale ou dépendances techniques font partie de ces choix qui conditionnent fortement la suite.\n\nL’organisation des contenus détermine la capacité à communiquer efficacement, à faire évoluer l’information, et à intégrer de nouveaux éléments sans remettre en cause la structure existante. Une architecture mal pensée génère de la confusion, des contenus dupliqués, et des difficultés de navigation qui impactent directement l’expérience utilisateur et le référencement.\n\nL’architecture technique conditionne la performance, la maintenabilité, et la capacité d’évolution. Les dépendances entre composants créent des couplages qui peuvent limiter la flexibilité future. Les choix de stack technique, de structure de données, ou d’intégrations déterminent les possibilités d’évolution et les coûts de maintenance.\n\nLeur correction ultérieure est souvent possible, mais rarement simple. Les identifier dès le départ permet de limiter les ajustements coûteux et les refontes successives. Cette identification nécessite une capacité à anticiper les évolutions probables, à évaluer les dépendances, et à choisir des architectures qui préservent la flexibilité sans alourdir inutilement la complexité initiale."
      },
      {
        index: "02",
        question: "Pourquoi certaines refontes coûtent plus qu’anticipé",
        answer:
          "Une refonte devient coûteuse lorsqu’elle vise à corriger des décisions initiales mal posées plutôt qu’à faire évoluer un projet sain. Le coût ne réside alors pas uniquement dans la technique, mais dans la remise en question du cadre global.\n\nLes décisions mal posées créent des dépendances qui se renforcent avec le temps : une architecture de contenu inadaptée génère des contenus qui s’y adaptent, rendant la restructuration d’autant plus complexe. Des choix techniques précipités créent des intégrations qui deviennent difficiles à modifier sans impact sur l’ensemble du système.\n\nPlus un projet avance sans fondations claires, plus les corrections ultérieures nécessitent de revenir en arrière, avec des impacts sur le budget et le planning. La refonte ne consiste plus alors à ajouter des fonctionnalités ou à améliorer l’existant, mais à déconstruire pour reconstruire, ce qui multiplie les coûts et les risques.\n\nCette situation est d’autant plus problématique que les décisions initiales conditionnent souvent les budgets alloués aux évolutions : un projet mal structuré consomme les ressources disponibles en corrections plutôt qu’en améliorations. L’investissement initial dans un cadrage solide évite ces cycles coûteux et permet d’allouer les budgets futurs à de véritables évolutions plutôt qu’à des corrections structurelles."
      },
      {
        index: "03",
        question: "Solution simple ou évolutive : une question de contexte",
        answer:
          "Opposer solution simple et solution évolutive n’a de sens qu’en tenant compte du contexte. Une solution simple peut être parfaitement adaptée à une activité stable, tandis qu’une structure plus évolutive devient nécessaire dès lors que l’activité est appelée à se transformer.\n\nLa simplicité est un avantage lorsque l’activité est mature, l’offre stabilisée, et les besoins prévisibles. Dans ces contextes, une architecture complexe représente un surcoût inutile en développement, maintenance et formation. Une solution simple est plus rapide à déployer, plus facile à maintenir, et plus économique à faire évoluer si nécessaire.\n\nL’évolutivité devient nécessaire lorsque l’activité est en croissance, l’offre en transformation, ou les besoins en mutation. Dans ces contextes, une architecture trop simple peut rapidement devenir un frein, nécessitant des refontes précoces coûteuses. Une structure évolutive permet d’intégrer de nouvelles fonctionnalités, de modifier les contenus, ou d’ajouter des intégrations sans remettre en cause les fondations.\n\nL’enjeu consiste à anticiper sans surdimensionner, en évaluant le besoin réel plutôt qu’en appliquant une règle générale. Cette évaluation nécessite d’analyser la trajectoire probable de l’activité, d’identifier les évolutions prévisibles, et de choisir une architecture qui préserve la flexibilité sans alourdir inutilement la complexité initiale. Le bon choix dépend moins d’une règle absolue que d’une compréhension fine du contexte et des enjeux à moyen terme."
      },
      {
        index: "04",
        question: "Quand la dette technique devient un enjeu opérationnel",
        answer:
          "La dette technique n’est pas problématique en soi. Elle le devient lorsqu’elle limite la capacité à décider, à évoluer ou à s’adapter. Cette transition se produit lorsque la dette technique commence à conditionner les choix stratégiques plutôt que de simplement représenter un coût de maintenance.\n\nLes signaux d’alerte sont multiples : impossibilité d’ajouter une fonctionnalité sans refonte partielle, temps de développement qui s’allonge de manière disproportionnée, ou dépendances techniques qui bloquent l’intégration de nouveaux outils. À ce stade, chaque évolution devient un projet en soi, avec des coûts et des délais qui ne sont plus proportionnels à la valeur apportée.\n\nÀ partir de ce moment, elle cesse d’être un sujet purement technique pour devenir un enjeu opérationnel, influençant directement la conduite du projet. Les décisions business sont alors contraintes par des limitations techniques plutôt que guidées par des opportunités stratégiques. La capacité d’innovation et d’adaptation se réduit, et l’activité peut se retrouver limitée par des choix techniques passés.\n\nCette situation nécessite une évaluation de la dette technique : identifier les éléments qui bloquent réellement l’évolution, évaluer le coût de correction versus le coût de contournement, et décider si une refonte partielle ou complète est justifiée. Cette analyse permet de transformer la dette technique d’un problème abstrait en décision opérationnelle éclairée."
      },
      {
        index: "05",
        question: "Ce que signifie réellement « prévoir l’évolution »",
        answer:
          "Prévoir l’évolution ne consiste pas à tout anticiper dès le départ, mais à éviter de se fermer des portes. Il s’agit de concevoir un cadre suffisamment clair et souple pour accueillir des évolutions sans remise en cause majeure.\n\nCette approche nécessite d’identifier les évolutions probables sans chercher à tout prévoir. Les scénarios d’évolution peuvent concerner l’ajout de fonctionnalités, l’intégration d’outils externes, la multiplication des contenus, ou l’adaptation à de nouveaux canaux. Chaque scénario implique des choix architecturaux différents : structure modulaire pour les fonctionnalités, API pour les intégrations, CMS pour les contenus, ou architecture responsive pour les canaux.\n\nL’art consiste à construire une base solide qui préserve la flexibilité sans surdimensionner la complexité initiale. Cela implique de choisir des technologies qui permettent l’évolution, de structurer les données de manière extensible, et d’organiser le code de façon modulaire. Ces choix techniques conditionnent la capacité future à faire évoluer le projet sans refonte complète.\n\nCette approche sécurise l’avenir sans alourdir inutilement la première version du projet. Elle permet de lancer rapidement une version initiale fonctionnelle tout en préservant la possibilité d’évolutions significatives. Le résultat est un projet qui peut grandir de manière organique plutôt que de nécessiter des refontes successives coûteuses."
      },
      {
        index: "06",
        question: "Pourquoi anticiper permet souvent de faire moins, mais mieux",
        answer:
          "Une réflexion en amont permet souvent de réduire le périmètre initial tout en renforçant la cohérence globale. Faire moins au départ n’est pas un compromis, mais une manière de concentrer les efforts sur ce qui est réellement structurant.\n\nCette réduction du périmètre résulte d’un travail de priorisation méthodique : identifier les éléments qui conditionnent l’ensemble du projet, évaluer l’impact de chaque fonctionnalité sur les objectifs principaux, et différer ce qui peut être ajouté ultérieurement sans impact négatif. Cette discipline permet de concentrer le budget et l’énergie sur les fondations plutôt que sur les détails.\n\nLe résultat est un projet plus cohérent car chaque élément a été choisi pour sa contribution aux objectifs principaux. Cette cohérence facilite la compréhension, l’usage, et la maintenance. Elle permet également de faire évoluer le projet de manière plus sereine, car les fondations sont solides et les ajouts ultérieurs s’intègrent naturellement dans la structure existante.\n\nCette approche favorise des projets plus lisibles, plus durables et plus faciles à faire évoluer. Elle évite la dispersion des efforts et garantit que chaque décision contribue réellement à la valeur du projet. Le résultat final est souvent supérieur à un projet qui aurait tenté de tout faire dès le départ, car la qualité et la cohérence priment sur la quantité."
      }
    ]
  },
  {
    id: 3,
    label: "Ma manière d’aborder un projet",
    questions: [
      {
        index: "01",
        question: "Ce que j’analyse avant toute solution technique",
        answer:
          "Avant toute réflexion sur une solution, j’analyse les objectifs réels, les contraintes implicites, la maturité de l’activité et les ressources mobilisables. Cette lecture globale permet de comprendre ce qui est possible, pertinent et soutenable.\n\nL’analyse des objectifs réels nécessite de distinguer les objectifs affichés des objectifs opérationnels. Un objectif de « visibilité » peut masquer un besoin de crédibilité, de différenciation, ou de génération de leads qualifiés. Chaque objectif implique des stratégies différentes : SEO pour la visibilité, design et contenu pour la crédibilité, architecture de conversion pour les leads.\n\nLes contraintes implicites sont souvent plus déterminantes que les contraintes exprimées : budget limité, délais serrés, ou ressources internes insuffisantes peuvent conditionner fortement les choix. La maturité de l’activité influence la capacité à définir clairement l’offre, à produire du contenu, ou à maintenir le projet dans la durée. Les ressources mobilisables concernent non seulement le budget initial, mais aussi la capacité à investir dans la maintenance et les évolutions.\n\nCette lecture globale permet de comprendre ce qui est possible, pertinent et soutenable. Elle évite de proposer des réponses déconnectées de la réalité du projet et de son environnement. Cette approche analytique nécessite du temps et de la méthode, mais elle garantit une meilleure adéquation entre la solution proposée et le contexte réel, réduisant ainsi les risques d’échec ou de décalage entre les attentes et la réalité."
      },
      {
        index: "02",
        question: "Comment je distingue l’essentiel de l’accessoire",
        answer:
          "Toutes les demandes formulées dans un projet sont légitimes, mais toutes ne sont pas prioritaires. Le cadrage consiste à identifier ce qui est structurant et ce qui peut être différé sans impact négatif.\n\nLes éléments structurants sont ceux qui conditionnent l’ensemble du projet : architecture de l’information, hiérarchie des contenus, parcours utilisateur principal, ou choix techniques qui engagent la suite. Les éléments accessoires peuvent être ajoutés ultérieurement sans remettre en cause les fondations : fonctionnalités secondaires, contenus complémentaires, ou optimisations non critiques.\n\nCette distinction nécessite une analyse méthodique : évaluer l’impact de chaque élément sur les objectifs principaux, identifier les dépendances entre les différents composants, et évaluer le coût d’ajout différé versus le coût d’intégration immédiate. Cette approche permet de concentrer les efforts sur ce qui apporte de la clarté et de la cohérence, tout en préservant la possibilité d’évolutions futures.\n\nLe résultat est un projet plus lisible, plus efficace, et plus facile à faire évoluer. Cette discipline de priorisation évite la dispersion des efforts et garantit que chaque décision contribue réellement aux objectifs principaux du projet."
      },
      {
        index: "03",
        question: "Pourquoi la technologie n’est jamais le premier sujet",
        answer:
          "Aborder la technologie trop tôt conduit souvent à figer des choix avant même d’avoir clarifié le cadre. Une même technologie peut être pertinente ou inadaptée selon le contexte. Cette précipitation technique génère fréquemment des architectures surdimensionnées ou inadaptées aux besoins réels.\n\nLes exemples sont nombreux : choisir un CMS complexe pour un site à contenu stable, opter pour une stack technique lourde pour un projet simple, ou intégrer des outils avancés avant d’avoir défini les processus. Ces choix techniques précoces conditionnent ensuite l’ensemble du projet, limitant la flexibilité et créant des dépendances qui peuvent devenir des contraintes.\n\nLa technologie n’a de sens qu’une fois les objectifs, contraintes et priorités clairement posés. Cette séquence permet de choisir des solutions adaptées au contexte réel plutôt que d’appliquer des standards génériques. Un même besoin peut être résolu par différentes approches techniques selon les contraintes de budget, de délai, de maintenance, ou d’évolution.\n\nCette approche méthodique garantit que les choix techniques servent les objectifs du projet plutôt que de les contraindre. Elle permet également d’évaluer plusieurs options et de choisir celle qui offre le meilleur équilibre entre performance, coût, maintenabilité et capacité d’évolution. Le résultat est une architecture technique cohérente avec les enjeux réels du projet."
      },
      {
        index: "04",
        question: "Comment je hiérarchise les priorités d’un projet",
        answer:
          "Hiérarchiser revient à accepter que tout ne peut pas être traité avec la même intensité au même moment. Cette hiérarchie s’appuie sur la valeur, la complexité et les risques associés.\n\nLa valeur se mesure par l’impact sur les objectifs principaux : une fonctionnalité qui génère directement des contacts a plus de valeur qu’une fonctionnalité esthétique secondaire. La complexité évalue l’effort nécessaire : une fonctionnalité simple à implémenter peut être prioritaire même si sa valeur est modérée. Les risques concernent les conséquences d’un échec ou d’un retard : un élément critique pour le lancement doit être traité en priorité.\n\nCette hiérarchisation nécessite une analyse méthodique : évaluer chaque élément selon ces trois critères, identifier les dépendances entre les différents composants, et construire un ordre d’exécution qui maximise la valeur tout en minimisant les risques. Cette approche permet de livrer rapidement les éléments les plus importants tout en préservant la possibilité d’ajouter les éléments secondaires ultérieurement.\n\nElle permet de construire un projet lisible, avec des étapes claires et des décisions assumées. Chaque phase a un objectif précis, des livrables définis, et des critères de succès mesurables. Cette structure facilite la communication, la validation, et l’ajustement en cours de route. Le résultat est un projet qui progresse de manière maîtrisée plutôt que de manière chaotique."
      },
      {
        index: "05",
        question: "Ce que je choisis volontairement de ne pas faire",
        answer:
          "Dans certains projets, la solidité repose autant sur ce qui est volontairement écarté que sur ce qui est ajouté. Certaines fonctionnalités peuvent être pertinentes à terme, mais contre-productives dans une première phase.\n\nLes raisons de différer sont multiples : une fonctionnalité peut être techniquement complexe sans apporter de valeur immédiate, elle peut créer des dépendances qui limitent la flexibilité future, ou elle peut alourdir l’interface utilisateur sans améliorer l’expérience principale. Dans ces cas, l’ajouter dès le départ fragilise le projet plutôt que de le renforcer.\n\nL’art consiste à distinguer ce qui est essentiel de ce qui est souhaitable, et à évaluer le coût d’ajout différé versus le coût d’intégration immédiate. Parfois, différer une fonctionnalité permet de mieux comprendre son usage réel avant de l’implémenter, évitant ainsi de construire quelque chose qui ne sera pas utilisé ou qui nécessitera des modifications importantes.\n\nLes différer permet de préserver la cohérence et d’éviter une complexité prématurée. Un projet simple et cohérent est plus facile à comprendre, à utiliser, et à faire évoluer. Cette discipline de retenue garantit que chaque élément ajouté contribue réellement à la valeur du projet plutôt que de le compliquer inutilement. Le résultat est un projet plus solide car mieux structuré, même s’il est moins complet dans sa première version."
      },
      {
        index: "06",
        question: "Comment un projet flou devient lisible et structuré",
        answer:
          "Un projet flou n’est pas un problème en soi. Il le devient lorsqu’aucun travail n’est fait pour en clarifier les contours. Ce flou initial est souvent normal, surtout pour des projets stratégiques où les enjeux sont multiples et les solutions non évidentes.\n\nLe travail de clarification consiste à explorer systématiquement les différentes dimensions du projet : identifier les objectifs réels derrière les objectifs affichés, distinguer les contraintes réelles des contraintes perçues, évaluer les ressources disponibles et les dépendances, et formuler des hypothèses sur les évolutions probables. Cette exploration nécessite du temps et de la méthode, mais elle transforme progressivement un besoin flou en projet structuré.\n\nLa reformulation joue un rôle clé : exprimer différemment le besoin permet souvent de révéler des enjeux cachés ou de distinguer ce qui est essentiel de ce qui est accessoire. La hiérarchisation permet ensuite d’organiser ces éléments selon leur importance et leurs dépendances, créant une structure logique qui guide les décisions.\n\nPar un travail progressif de reformulation et de hiérarchisation, il est possible de transformer ce flou initial en décisions éclairées. Ce processus nécessite de la patience et de la rigueur, mais il garantit que chaque décision est prise en connaissance de cause plutôt que par intuition ou par défaut. Le résultat est un projet plus solide car mieux compris, même si le chemin pour y arriver a nécessité plus de temps que prévu initialement."
      }
    ]
  },
  {
    id: 4,
    label: "Arbitrages et cohérence du projet",
    questions: [
      {
        index: "01",
        question: "Pourquoi tout ne doit pas être fait dès le départ",
        answer:
          "Chercher à tout intégrer dès la première version fragilise souvent le projet. Cette approche conduit à des choix précipités et à une complexité inutile. La pression de tout faire en même temps génère fréquemment des compromis qui affaiblissent la cohérence globale.\n\nLes risques sont multiples : dispersion des efforts sur trop d’éléments, manque de temps pour valider chaque décision, ou création de dépendances complexes entre des composants qui auraient pu être développés séparément. Cette complexité prématurée rend le projet difficile à comprendre, à maintenir, et à faire évoluer.\n\nUne version initiale solide repose sur la capacité à identifier l’essentiel tout en laissant de la place pour des évolutions futures. Cette approche nécessite une discipline de priorisation : distinguer ce qui est structurant de ce qui peut être différé, évaluer l’impact de chaque élément sur les objectifs principaux, et construire une base solide qui supportera les ajouts ultérieurs.\n\nLe résultat est un projet plus cohérent car chaque élément a été choisi pour sa contribution aux objectifs principaux. Cette cohérence facilite la compréhension, la validation, et la maintenance. Elle permet également de faire évoluer le projet de manière plus sereine, car les fondations sont solides et les ajouts s’intègrent naturellement dans la structure existante."
      },
      {
        index: "02",
        question: "Quand simplifier renforce un projet",
        answer:
          "La simplification n’est pas une perte de valeur. Elle renforce la compréhension, l’usage et la cohérence globale du projet. Cette approche nécessite de distinguer la simplicité de la pauvreté : simplifier consiste à retirer l’inutile pour renforcer l’essentiel, pas à réduire la qualité.\n\nLa simplification améliore la compréhension en éliminant les éléments qui créent de la confusion ou de la redondance. Elle facilite l’usage en réduisant la charge cognitive nécessaire pour naviguer et utiliser le projet. Elle renforce la cohérence en garantissant que chaque élément a un rôle clair et contribue aux objectifs principaux.\n\nUn projet lisible est plus facile à faire évoluer car sa structure est claire et les dépendances sont maîtrisées. Il est plus facile à expliquer car les choix sont assumés et justifiés. Il est plus facile à maintenir car la complexité est maîtrisée et les modifications ont un impact prévisible.\n\nCette discipline de simplification nécessite du courage : accepter de ne pas tout faire, de différer certaines fonctionnalités, ou de choisir des solutions plus simples mais mieux adaptées. Ce courage est récompensé par un projet plus solide, plus efficace, et plus durable. Le résultat final est souvent supérieur à un projet qui aurait tenté de tout faire, car la qualité et la cohérence priment sur la quantité."
      },
      {
        index: "03",
        question: "Comment choisir entre plusieurs options raisonnables",
        answer:
          "Il arrive que plusieurs options soient viables. Le choix repose alors sur leur cohérence avec le contexte, les contraintes et les priorités à moyen terme. Cette situation est fréquente dans les projets complexes où différentes approches peuvent techniquement répondre au besoin.\n\nL’évaluation de ces options nécessite d’analyser plusieurs dimensions : la performance technique, le coût de développement et de maintenance, la capacité d’évolution, la compatibilité avec l’existant, ou l’impact sur les processus internes. Chaque option présente des avantages et des inconvénients qui doivent être évalués en fonction du contexte spécifique du projet.\n\nLe choix optimal n’est pas toujours celui qui est techniquement le plus avancé, mais celui qui offre le meilleur équilibre entre performance, coût, maintenabilité et capacité d’évolution. Cette évaluation nécessite une compréhension fine des enjeux business, des contraintes organisationnelles, et des priorités stratégiques.\n\nCe type de décision dépasse le cadre purement technique. Il nécessite une capacité à comprendre les implications business, à évaluer les risques, et à proposer des solutions adaptées plutôt que des réponses standardisées. Cette dimension stratégique transforme le projet d’une simple exécution technique en véritable accompagnement décisionnel."
      },
      {
        index: "04",
        question: "L’intérêt d’une approche progressive et maîtrisée",
        answer:
          "Découper un projet en phases permet de sécuriser les décisions et de limiter les risques. Cette approche progressive transforme un projet complexe en une série d’étapes maîtrisables, chacune avec des objectifs clairs et des critères de succès mesurables.\n\nChaque phase permet de valider des hypothèses avant de passer à la suivante : la première phase peut valider l’architecture générale, la seconde peut tester les fonctionnalités principales, et les phases suivantes peuvent ajouter les éléments complémentaires. Cette validation progressive réduit les risques d’échec et permet d’ajuster la trajectoire en fonction des retours et des apprentissages.\n\nCette approche facilite les ajustements car chaque phase peut être adaptée en fonction des résultats de la phase précédente. Elle permet également l’observation des usages réels : mettre en ligne une première version permet de comprendre comment le projet est réellement utilisé, quelles fonctionnalités sont prioritaires, et quels ajustements sont nécessaires.\n\nLe résultat est un projet qui progresse de manière maîtrisée plutôt que de manière chaotique. Chaque phase apporte de la valeur tout en préparant la suivante, créant une trajectoire claire et assumée. Cette méthode réduit les risques tout en préservant la flexibilité nécessaire pour s’adapter aux évolutions du contexte ou des besoins."
      },
      {
        index: "05",
        question: "Pourquoi certaines décisions gagnent à être différées",
        answer:
          "Toutes les décisions n’ont pas le même degré d’urgence. Différer certaines d’entre elles permet d’éviter des choix prématurés. Cette discipline de retenue est souvent difficile à accepter, surtout lorsque la pression temporelle ou la volonté de tout faire rapidement pousse à décider rapidement.\n\nLes décisions qui peuvent être différées sont celles qui ne conditionnent pas les choix suivants, qui peuvent être prises avec plus d’informations disponibles, ou qui ont un impact limité sur les objectifs principaux. Différer ces décisions permet de mieux comprendre le contexte, d’évaluer les usages réels, ou d’attendre que les priorités se clarifient.\n\nCette retenue contribue à une meilleure maîtrise du projet dans le temps. Elle évite de prendre des décisions sous pression qui pourraient limiter les possibilités futures ou créer des dépendances difficiles à modifier. Elle permet également de concentrer l’énergie sur les décisions qui sont réellement structurantes, garantissant ainsi leur qualité.\n\nLe résultat est un projet où chaque décision est prise au bon moment, avec les bonnes informations, et dans le bon contexte. Cette approche méthodique peut sembler plus lente au départ, mais elle évite les corrections coûteuses et garantit une meilleure qualité globale du projet."
      },
      {
        index: "06",
        question: "Maintenir une cohérence globale dans le temps",
        answer:
          "La cohérence repose sur des choix initiaux clairs et une attention constante aux décisions prises au fil du temps. Cette cohérence n’est pas statique mais évolutive : elle nécessite de maintenir une vision globale du projet tout en permettant des ajustements nécessaires.\n\nLes choix initiaux clairs créent un cadre de référence qui guide les décisions ultérieures. Ce cadre peut concerner l’architecture générale, les principes de design, les priorités stratégiques, ou les contraintes techniques. Ce cadre n’est pas rigide mais il fournit des critères pour évaluer la pertinence des nouvelles décisions.\n\nL’attention constante aux décisions prises au fil du temps permet de détecter les dérives potentielles : des choix qui s’écartent progressivement du cadre initial, des ajouts qui créent de la complexité sans apporter de valeur, ou des évolutions qui remettent en cause la cohérence globale. Cette vigilance permet de corriger les trajectoires avant qu’elles ne deviennent problématiques.\n\nElle permet au projet de rester lisible malgré les évolutions. Un projet cohérent est plus facile à comprendre, à utiliser, et à maintenir, même après plusieurs phases d’évolution. Cette cohérence facilite également la communication et la validation, car les choix restent alignés avec les objectifs initiaux tout en s’adaptant aux nouveaux besoins. Le résultat est un projet qui grandit de manière organique plutôt que de manière chaotique."
      }
    ]
  },
  {
    id: 5,
    label: "Mon rôle dans ce type de projet",
    questions: [
      {
        index: "01",
        question: "Dans quels contextes mon intervention est pertinente",
        answer:
          "Mon intervention est pertinente lorsque le projet engage des décisions durables et nécessite une réflexion structurée avant l’exécution. Ces projets se caractérisent par plusieurs indicateurs : budget significatif (généralement au-delà de 15-20k€), enjeux stratégiques pour l’activité, complexité organisationnelle ou technique, ou besoin de cohérence à long terme.\n\nDans ces contextes, l’approche classique « brief → devis → réalisation » est insuffisante. Elle ne permet pas d’identifier les enjeux cachés, d’évaluer les conséquences des décisions, ou de construire une solution réellement adaptée au contexte. Mon intervention apporte un cadre méthodique d’analyse et de décision qui transforme un besoin flou en projet structuré.\n\nDans des contextes plus simples, une approche plus directe peut suffire : site vitrine basique, besoin opérationnel clairement défini, ou projet à faible enjeu stratégique. Dans ces cas, une solution standard ou une intervention plus rapide est souvent plus adaptée et plus économique.\n\nLa distinction entre ces deux types de projets n’est pas toujours évidente au départ. C’est pourquoi un premier échange permet d’évaluer la pertinence de mon approche et de proposer l’intervention la plus adaptée au contexte réel."
      },
      {
        index: "02",
        question: "Ce que j’apporte au-delà de la réalisation",
        answer:
          "Au-delà de la réalisation, j’apporte un cadre de réflexion et une aide à la décision. Cette dimension méthodique transforme un projet de simple exécution en véritable accompagnement stratégique.\n\nLe cadre de réflexion consiste à structurer l’analyse du besoin, à identifier les enjeux cachés, et à formuler des hypothèses que le projet permettra de valider. Cette approche méthodique évite les décisions précipitées et garantit que chaque choix est éclairé par une compréhension fine du contexte.\n\nL’aide à la décision prend plusieurs formes : évaluation des options techniques en fonction des contraintes réelles, hiérarchisation des priorités selon leur impact, ou arbitrage entre différentes approches possibles. Cette dimension conseil nécessite une capacité à comprendre les enjeux business, à évaluer les risques, et à proposer des solutions adaptées plutôt que des réponses standardisées.\n\nCet apport vise à sécuriser les choix effectués et à éviter des ajustements coûteux. Il transforme également le projet en opportunité d’apprentissage : comprendre pourquoi certaines décisions sont prises, quelles sont leurs implications, et comment le projet s’intègre dans une stratégie plus large. Cette dimension pédagogique renforce la capacité du client à prendre des décisions éclairées sur le long terme, au-delà du projet initial."
      },
      {
        index: "03",
        question: "Ce que je ne propose volontairement pas",
        answer:
          "Je n’interviens pas sur des projets purement exécutifs sans réflexion préalable. Ces projets se caractérisent par un besoin entièrement défini, des contraintes clairement établies, et une solution technique évidente. Dans ces contextes, mon approche analytique n’apporte pas de valeur ajoutée et représente un surcoût inutile.\n\nMon intervention est pertinente lorsque le projet nécessite un travail de cadrage, de structuration, ou d’arbitrage entre différentes options. Lorsque le besoin est flou, les contraintes implicites, ou les conséquences des décisions incertaines, mon approche méthodique permet de transformer un projet fragile en projet solide.\n\nDans certains cas, une solution standard est plus adaptée : site vitrine basique, besoin opérationnel simple, ou projet à faible enjeu stratégique. Ces contextes ne justifient pas l’investissement dans une approche sur mesure et bénéficient davantage d’une solution éprouvée, rapide à déployer, et économique à maintenir.\n\nCette sélectivité permet de concentrer mon intervention sur les projets où elle apporte réellement de la valeur : ceux qui nécessitent une réflexion structurée, une analyse approfondie, et une solution adaptée au contexte spécifique. Cette approche garantit une meilleure adéquation entre mon expertise et les besoins réels du client."
      },
      {
        index: "04",
        question: "Ma place entre exécution, conseil et accompagnement",
        answer:
          "Selon le contexte, mon rôle peut aller d’un cadrage ponctuel à un accompagnement plus continu. Cette flexibilité permet d’adapter mon intervention à la complexité du projet et aux besoins réels du client.\n\nUn cadrage ponctuel est adapté lorsque le projet nécessite une réflexion structurée en amont mais peut ensuite être exécuté de manière plus autonome. Cette intervention se concentre sur l’analyse du besoin, la structuration du projet, et la définition d’un cadre clair qui guidera les décisions ultérieures. Le résultat est un document de cadrage qui sert de référence pour la suite du projet.\n\nUn accompagnement plus continu est nécessaire lorsque le projet est complexe, évolutif, ou nécessite des arbitrages réguliers. Cette approche permet de maintenir la cohérence au fil des évolutions, d’ajuster la trajectoire en fonction des apprentissages, et de sécuriser les décisions importantes. Cette dimension d’accompagnement transforme le projet en véritable partenariat plutôt qu’en simple prestation.\n\nL’objectif reste d’apporter de la clarté et de préserver la cohérence du projet, quelle que soit la forme de l’intervention. Cette clarté facilite la prise de décision, réduit les risques, et garantit que le projet progresse de manière maîtrisée. La cohérence assure que les évolutions s’intègrent naturellement dans la structure existante plutôt que de la fragiliser."
      },
      {
        index: "05",
        question: "Comment je travaille avec des décideurs",
        answer:
          "Le travail repose sur des échanges clairs et une compréhension partagée des enjeux. Cette base relationnelle est essentielle pour construire un projet solide et éviter les malentendus qui peuvent fragiliser la collaboration.\n\nLes échanges clairs nécessitent de formuler les questions de manière précise, d’expliquer les enjeux techniques en termes compréhensibles, et de présenter les options avec leurs implications. Cette transparence permet au client de prendre des décisions éclairées plutôt que de simplement valider des propositions sans comprendre leurs conséquences.\n\nLa compréhension partagée des enjeux garantit que les décisions sont prises en connaissance de cause. Cette compréhension nécessite du temps et de la méthode : explorer les différentes dimensions du projet, identifier les contraintes réelles, évaluer les risques, et formuler des hypothèses que le projet permettra de valider.\n\nLes décisions sont prises de manière éclairée et assumée. Cette approche transforme le projet d’une simple exécution en véritable collaboration, où chaque décision est discutée, justifiée, et acceptée par toutes les parties. Le résultat est un projet plus solide car mieux compris, avec des décisions qui sont assumées plutôt que subies."
      },
      {
        index: "06",
        question: "Ce que signifie concrètement travailler ensemble",
        answer:
          "Travailler ensemble implique un engagement réciproque, une transparence et un respect du cadre défini. Ces conditions relationnelles sont essentielles pour construire un projet solide et éviter les tensions qui peuvent fragiliser la collaboration.\n\nL’engagement réciproque signifie que chaque partie s’investit dans le projet : le client en étant disponible pour les échanges et les validations nécessaires, moi en apportant l’expertise et la rigueur méthodique. Cet engagement mutuel garantit que le projet progresse de manière régulière et que les décisions sont prises dans les temps.\n\nLa transparence concerne la communication des enjeux, des contraintes, et des risques. Cette transparence permet d’éviter les surprises désagréables et de prendre des décisions en connaissance de cause. Elle nécessite de formuler clairement les problèmes, d’expliquer les implications des choix, et de présenter les options avec leurs avantages et leurs inconvénients.\n\nLe respect du cadre défini garantit que les engagements sont tenus : respect des délais, respect du budget, respect des processus de validation. Ce cadre n’est pas rigide mais il fournit une structure qui sécurise la collaboration et évite les dérives.\n\nCes conditions permettent d’avancer sereinement. Un projet où la confiance est établie, la communication est claire, et les engagements sont respectés progresse de manière plus fluide et produit de meilleurs résultats. Cette qualité relationnelle est souvent aussi importante que la qualité technique pour le succès d’un projet."
      }
    ]
  },
  {
    id: 6,
    label: "Décider d’avancer ensemble",
    questions: [
      {
        index: "01",
        question: "Quand mon approche est adaptée",
        answer:
          "Mon approche est adaptée lorsque le projet nécessite une réflexion approfondie avant l’exécution. Ces projets se caractérisent par plusieurs indicateurs : budget significatif, enjeux stratégiques pour l’activité, complexité organisationnelle ou technique, ou besoin de cohérence à long terme.\n\nDans ces contextes, l’approche classique « brief → devis → réalisation » est insuffisante. Elle ne permet pas d’identifier les enjeux cachés, d’évaluer les conséquences des décisions, ou de construire une solution réellement adaptée au contexte. Mon intervention apporte un cadre méthodique d’analyse et de décision qui transforme un besoin flou en projet structuré.\n\nElle s’adresse à des projets engageant l’activité au-delà du court terme. Ces projets conditionnent la manière dont l’activité se présente, se rend compréhensible, et peut évoluer. Les décisions prises ont des conséquences durables, et il est essentiel qu’elles soient prises en connaissance de cause plutôt que par défaut ou par précipitation.\n\nCette approche nécessite un investissement initial en temps et en réflexion, mais cet investissement est rapidement rentabilisé par la qualité des décisions prises et l’évitement des ajustements coûteux. Le résultat est un projet plus solide, plus cohérent, et plus facile à faire évoluer dans le temps."
      },
      {
        index: "02",
        question: "Quand elle ne l’est probablement pas",
        answer:
          "Elle l’est moins lorsque le besoin est strictement opérationnel ou entièrement défini à l’avance. Ces projets se caractérisent par un objectif clair, des contraintes bien établies, et une solution technique évidente. Dans ces contextes, mon approche analytique n’apporte pas de valeur ajoutée et représente un surcoût inutile.\n\nLes projets opérationnels concernent des besoins ponctuels et bien définis : mise à jour technique, correction de bugs, ou ajout de fonctionnalités simples. Les projets entièrement définis à l’avance ont un cahier des charges précis, des spécifications détaillées, et une solution technique identifiée. Dans ces cas, l’enjeu est l’exécution plutôt que la réflexion.\n\nDans ces cas, une intervention plus directe est souvent plus pertinente. Une solution standard, une intervention rapide, ou une approche plus exécutive est généralement plus adaptée et plus économique. Cette sélectivité permet de concentrer mon intervention sur les projets où elle apporte réellement de la valeur.\n\nCette distinction n’est pas toujours évidente au départ, et c’est pourquoi un premier échange permet d’évaluer la pertinence de mon approche. L’objectif n’est pas de forcer une méthode, mais de proposer l’intervention la plus adaptée au contexte réel, qu’il s’agisse d’un cadrage approfondi ou d’une approche plus directe."
      },
      {
        index: "03",
        question: "À quoi sert un premier échange",
        answer:
          "Un premier échange permet de vérifier l’adéquation entre le contexte du projet et mon approche. Cette rencontre initiale est essentielle pour évaluer si ma méthode est pertinente pour le projet spécifique et si une collaboration est envisageable.\n\nCet échange permet d’explorer plusieurs dimensions : comprendre les objectifs réels du projet, identifier les contraintes principales, évaluer la complexité des enjeux, et déterminer si le projet nécessite une réflexion structurée ou peut être traité de manière plus directe. Cette exploration nécessite de poser les bonnes questions plutôt que de proposer immédiatement des solutions.\n\nIl vise à poser un premier cadre, sans engagement prématuré. Cet échange est sans engagement : il permet de clarifier mutuellement les attentes, d’évaluer la pertinence de mon approche, et de déterminer si une collaboration est envisageable. Cette transparence initiale évite les malentendus et garantit que les décisions sont prises en connaissance de cause.\n\nLe résultat de cet échange peut être une proposition d’intervention adaptée, une recommandation vers une approche plus directe, ou simplement une clarification qui permet au client de mieux comprendre ses propres besoins. Dans tous les cas, cet échange apporte de la valeur en apportant de la clarté sur le projet et les options possibles."
      },
      {
        index: "04",
        question: "Ce que j’attends avant de m’engager",
        answer:
          "Avant tout engagement, j’attends une compréhension claire des enjeux, des contraintes et des attentes. Cette clarté initiale est essentielle pour construire un projet solide et éviter les malentendus qui peuvent fragiliser la collaboration.\n\nLa compréhension des enjeux nécessite d’identifier les objectifs réels derrière les objectifs affichés, de distinguer les enjeux stratégiques des enjeux opérationnels, et d’évaluer l’impact du projet sur l’activité globale. Cette analyse permet de dimensionner correctement le projet et de prioriser les éléments structurants.\n\nL’identification des contraintes inclut non seulement le budget et les délais, mais aussi les ressources internes, les dépendances organisationnelles, et les limites techniques existantes. Ces contraintes conditionnent fortement les choix possibles et il est essentiel qu’elles soient clairement exprimées dès le départ.\n\nLa clarification des attentes permet d’aligner les objectifs et d’éviter les déceptions. Ces attentes concernent non seulement le résultat final, mais aussi le processus de collaboration, le niveau d’accompagnement souhaité, et les critères de succès du projet.\n\nCette clarté est indispensable pour éviter toute ambiguïté. Un projet où les enjeux, contraintes et attentes sont clairement exprimés et compris progresse de manière plus fluide et produit de meilleurs résultats. Cette transparence initiale est un investissement qui évite les ajustements coûteux en cours de route."
      },
      {
        index: "05",
        question: "Les conditions d’une collaboration saine",
        answer:
          "Une collaboration saine repose sur la confiance, la transparence et la capacité à prendre des décisions partagées. Ces éléments relationnels sont essentiels pour construire un projet solide et éviter les tensions qui peuvent fragiliser la collaboration.\n\nLa confiance se construit progressivement par la qualité des échanges, la rigueur méthodique, et le respect des engagements. Cette confiance permet de discuter ouvertement des difficultés, de proposer des ajustements, et de prendre des décisions assumées plutôt que subies. Sans confiance, chaque décision devient un sujet de négociation plutôt qu’un choix éclairé.\n\nLa transparence concerne la communication des enjeux, des contraintes, et des risques. Cette transparence permet d’éviter les surprises désagréables et de prendre des décisions en connaissance de cause. Elle nécessite de formuler clairement les problèmes, d’expliquer les implications des choix, et de présenter les options avec leurs avantages et leurs inconvénients.\n\nLa capacité à prendre des décisions partagées transforme le projet d’une simple prestation en véritable collaboration. Cette approche nécessite que chaque décision soit discutée, justifiée, et acceptée par toutes les parties. Cette méthode garantit que les choix sont assumés et que le projet progresse de manière consensuelle.\n\nCes éléments sécurisent le projet. Un projet où la confiance est établie, la communication est transparente, et les décisions sont partagées progresse de manière plus fluide et produit de meilleurs résultats. Cette qualité relationnelle est souvent aussi importante que la qualité technique pour le succès d’un projet."
      },
      {
        index: "06",
        question: "Pourquoi la clarté prime toujours sur la promesse",
        answer:
          "La clarté permet de construire des projets durables. Cette clarté concerne non seulement les objectifs et les contraintes, mais aussi les processus, les critères de succès, et les implications des décisions. Un projet clair est plus facile à comprendre, à valider, et à faire évoluer.\n\nLa clarté nécessite un travail de formulation et de structuration : exprimer les enjeux de manière précise, identifier les dépendances entre les différents éléments, et définir des critères mesurables de succès. Ce travail peut sembler fastidieux au départ, mais il évite les malentendus et garantit que toutes les parties partagent la même compréhension du projet.\n\nLes promesses non fondées fragilisent les décisions car elles créent des attentes irréalistes qui ne peuvent pas être satisfaites. Ces promesses génèrent fréquemment des déceptions, des tensions, et des ajustements coûteux. Elles transforment le projet en source de frustration plutôt qu’en opportunité de transformation.\n\nUn cadre clair les sécurise en définissant précisément ce qui est possible, ce qui est attendu, et ce qui est exclu. Ce cadre n’est pas rigide mais il fournit des limites et des critères qui guident les décisions. Cette structure permet de prendre des décisions éclairées plutôt que de réagir aux pressions ou aux attentes non exprimées.\n\nLe résultat est un projet plus solide car mieux compris, avec des attentes réalistes et des décisions assumées. Cette clarté facilite également la communication et la validation, car les critères de succès sont définis et partagés. Un projet clair est un projet durable."
      }
    ]
  }
];


export default function DecisionLayer() {
  const [activeCategory, setActiveCategory] = useState(1)
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set())
  const [userSelectedCategory, setUserSelectedCategory] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const questionRefs = useRef<(HTMLElement | null)[]>([])
  const categoryRefs = useRef<(HTMLElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const mobileCategoriesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleQuestion = (questionKey: string) => {
    setOpenQuestions((prev) => {
      // Si la question est déjà ouverte, on la ferme
      if (prev.has(questionKey)) {
        return new Set<string>()
      }
      // Sinon, on ferme toutes les autres et on ouvre uniquement celle-ci
      return new Set<string>([questionKey])
    })
  }

  // Scroll-based category highlighting (seulement si l'utilisateur n'a pas sélectionné manuellement)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      
      // Si l'utilisateur a sélectionné manuellement une catégorie, ne pas la changer avec le scroll
      if (userSelectedCategory !== null) return

      const scrollY = window.scrollY + window.innerHeight * 0.4 // Offset pour le centre de l'écran
      
      // Ne vérifier que la catégorie 1 (la seule qui a des questions affichées)
      const category1Ref = questionRefs.current[0]
      if (category1Ref) {
        const rect = category1Ref.getBoundingClientRect()
        const elementTop = rect.top + window.scrollY
        const elementBottom = elementTop + rect.height
        
        if (scrollY >= elementTop && scrollY < elementBottom) {
          setActiveCategory(1)
        } else if (window.scrollY < 100) {
          // Si on est en haut de la page, activer la catégorie 1 par défaut
          setActiveCategory(1)
        } else {
          // Si on n'est pas dans la catégorie 1, désactiver le highlight
          setActiveCategory(0)
        }
      } else {
        // Si la ref n'est pas encore disponible, activer la catégorie 1 par défaut
        setActiveCategory(1)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Initial check avec un petit délai pour laisser le temps au DOM de se charger
    setTimeout(() => {
      handleScroll()
    }, 100)
    
    return () => window.removeEventListener("scroll", handleScroll)
  }, [userSelectedCategory])

  // Centrer automatiquement la catégorie sélectionnée sur mobile
  useEffect(() => {
    if (!mobileCategoriesRef.current) return
    
    // Trouver le bouton de la catégorie active
    const activeButton = mobileCategoriesRef.current.querySelector(
      `button[data-category-id="${activeCategory}"]`
    ) as HTMLElement
    
    if (activeButton) {
      const container = mobileCategoriesRef.current
      const containerRect = container.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      
      // Calculer la position pour centrer le bouton
      const scrollLeft = container.scrollLeft + (buttonRect.left - containerRect.left) - (containerRect.width / 2) + (buttonRect.width / 2)
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
    }
  }, [activeCategory])

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-full"
    >

      {/* LEFT COLUMN - Category Labels (Fixed) - Outside grid for true fixed positioning */}
      <div className="hidden lg:block fixed top-40 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative" style={{ width: '240px' }}>
            <div className="space-y-12 pointer-events-auto">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  ref={(el) => {
                    categoryRefs.current[category.id - 1] = el
                  }}
                  onClick={() => {
                    // Marquer que l'utilisateur a sélectionné manuellement une catégorie
                    setUserSelectedCategory(category.id)
                    // Activer la catégorie cliquée
                    setActiveCategory(category.id)
                    
                    // Scroller vers les questions de la catégorie sélectionnée
                    const questionRef = questionRefs.current[category.id - 1]
                    if (questionRef) {
                      // Petit délai pour laisser le temps au contenu de se mettre à jour
                      setTimeout(() => {
                        questionRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 50)
                    } else {
                      // Si pas de contenu, scroller en haut
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  className={`transition-all duration-500 text-left cursor-pointer ${
                    activeCategory === category.id
                      ? "opacity-100 text-cyan-400 relative"
                      : "opacity-100 text-black hover:text-cyan-400"
                  }`}
                >
                  <h2 className="font-kode text-sm uppercase tracking-wider leading-relaxed relative pl-4 font-light" style={{ wordBreak: 'normal', overflowWrap: 'normal', hyphens: 'none', color: activeCategory === category.id ? undefined : '#000000' }}>
                    {activeCategory === category.id && (
                      <>
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-cyan-400 rounded-full"></span>
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-cyan-400 rounded-full blur-sm opacity-60"></span>
                      </>
                    )}
                    <span className={activeCategory === category.id ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" : ""}>
                      {category.label.replace(/(\w+)\s+(\?)/g, '$1\u00A0$2')}
                    </span>
                  </h2>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main container - Layout avec colonne fixe (catégories) et colonne scrollable (questions) - Desktop uniquement */}
      <div className="hidden lg:block relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-40 pointer-events-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-16">
          
          {/* Spacer for fixed categories on desktop */}
          <div className="hidden lg:block"></div>

          {/* CENTER COLUMN - Question Modules avec scroll interne et edge fade */}
          {/* Conteneur scrollable avec hauteur fixe pour activer le mask CSS */}
          {/* Le mask s'applique dès le début du conteneur, le padding est dans le wrapper interne */}
          {/* Sur mobile (< lg), le scroll interne est désactivé (pas de max-h) et le fade est désactivé via CSS */}
          {/* Sur desktop (>= lg), le scroll interne est activé avec max-h et le fade fonctionne */}
          <div 
            className="scroll-fade-container lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:overscroll-contain custom-scrollbar pr-2 relative z-0"
            id="question-column"
            style={{ zIndex: 0 }}
          >
            {/* Wrapper interne avec padding pour le layout */}
            <div className="pt-8 pb-40 space-y-32 lg:space-y-40">
            {/* Afficher uniquement les questions de la catégorie active */}
            {categories
              .filter((category) => category.id === activeCategory)
              .map((category) => (
                <motion.div
                  key={category.id}
                  ref={(el) => {
                    questionRefs.current[category.id - 1] = el
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="max-w-2xl"
                  style={{ color: 'inherit' }}
                >
                  <div className="space-y-6">
                    {category.questions.map((q, qIndex) => {
                      const questionKey = `${category.id}-${qIndex}`
                      const isOpen = openQuestions.has(questionKey)
                      const hasAnswer = !!q.answer
                      
                      return (
                        <div key={questionKey} className="space-y-4">
                          {hasAnswer ? (
                            // Accordéon pour les questions avec réponses
                            <button
                              onClick={() => toggleQuestion(questionKey)}
                              className="w-full text-left group"
                            >
                              <div className="flex items-baseline gap-4">
                                <span className="font-kode text-xs text-gray-500 tracking-wider">
                                  {q.index}
                                </span>
                                <h3 className="font-jetbrains text-xl md:text-2xl text-black font-light leading-relaxed group-hover:text-cyan-400 transition-colors duration-300">
                                  {q.question}
                                </h3>
                                <span className="ml-auto text-cyan-400 text-lg transition-transform duration-300" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                  ›
                                </span>
                              </div>
                            </button>
                          ) : (
                            // Affichage simple pour les questions sans réponses
                            <div className="flex items-baseline gap-4">
                              <span className="font-kode text-xs text-gray-500 tracking-wider">
                                {q.index}
                              </span>
                              <h3 className="font-jetbrains text-xl md:text-2xl font-light leading-relaxed" style={{ color: '#000000' }}>
                                {q.question}
                              </h3>
                            </div>
                          )}
                          
                          {/* Réponse (accordéon) */}
                          {hasAnswer && isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="ml-12 overflow-hidden"
                            >
                              <div className="font-jetbrains text-sm text-black leading-loose pt-2 max-w-2xl space-y-3">
                                {String(q.answer)
                                  .split(/(?<=[.!?])\s+(?=[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ])/)
                                  .filter(s => s.trim().length > 0)
                                  .map((sentence, idx) => {
                                    return (
                                      <p key={idx} className="text-justify" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}>
                                        <ShuffleText 
                                          triggerShuffle={isOpen}
                                          enableHover={false}
                                          totalDuration={800}
                                          className=""
                                        >
                                          {sentence.trim()}
                                        </ShuffleText>
                                      </p>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                          
                          {/* Micro-text (pour les questions sans réponses) */}
                          {!hasAnswer && q.microText && (
                            <p className="font-jetbrains text-sm text-gray-500 ml-12 max-w-lg">
                              {q.microText}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* END OF PAGE - Concluding text and CTA (Fixed Bottom) - Desktop uniquement */}
      {/* Utilisation d'un portal pour sortir du contexte de stacking */}
      {mounted && typeof window !== 'undefined' && createPortal(
        <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none" style={{ zIndex: 9999 }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-2xl lg:ml-[240px] pointer-events-auto" style={{ zIndex: 10000 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="space-y-6"
              >
                <p className="font-jetbrains text-base text-black leading-relaxed">
                  Ces questions n'ont pas vocation à fournir des réponses immédiates.
                  <br />
                  Elles structurent la réflexion et permettent d'évaluer la pertinence et la faisabilité d'un projet, à la lumière de son contexte réel.
                </p>
                
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.location.href = '/contact'
                  }}
                  className="inline-block font-jetbrains text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-300 border-b border-cyan-400/30 hover:border-cyan-400/60 pb-1 cursor-pointer"
                  style={{ position: 'relative', zIndex: 10001 }}
                >
                  Échanger sur la pertinence du projet
                </a>
              </motion.div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile: Categories horizontalement au-dessus des questions */}
      <div className="lg:hidden px-4 sm:px-6 pt-20 pb-32 scroll-fade-container">
        {/* Liste des catégories en horizontal scrollable */}
        <div 
          ref={mobileCategoriesRef}
          className="flex gap-3 overflow-x-auto pb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 custom-scrollbar snap-x snap-mandatory"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              data-category-id={category.id}
              onClick={() => {
                setUserSelectedCategory(category.id)
                setActiveCategory(category.id)
                
                // Scroller vers le contenu de la catégorie
                const questionRef = questionRefs.current[category.id - 1]
                if (questionRef) {
                  setTimeout(() => {
                    questionRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }
              }}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full border-2 transition-all duration-300 snap-start ${
                activeCategory === category.id
                  ? "bg-cyan-400 text-black border-cyan-400 shadow-lg shadow-cyan-400/20"
                  : "bg-transparent text-gray-600 border-gray-400 hover:border-gray-300"
              }`}
            >
              <span className="font-kode text-xs uppercase tracking-wider whitespace-nowrap">
                {category.label.replace(/(\w+)\s+(\?)/g, '$1\u00A0$2')}
              </span>
            </button>
          ))}
        </div>
        
        {/* Contenu des questions/réponses */}
        <div className="space-y-32">
          {/* Afficher uniquement la catégorie active sur mobile */}
          {categories
            .filter((category) => category.id === activeCategory)
            .map((category) => (
              <motion.section
                key={category.id}
                ref={(el) => {
                  questionRefs.current[category.id - 1] = el
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="space-y-6"
              >
                <h2 className="font-kode text-xs uppercase tracking-wider text-black border-b border-gray-800 pb-2">
                  {category.label}
                </h2>
                
                <div className="space-y-6">
                  {category.questions.map((q, qIndex) => {
                    const questionKey = `${category.id}-${qIndex}`
                    const isOpen = openQuestions.has(questionKey)
                    const hasAnswer = !!q.answer
                    
                    return (
                      <div key={questionKey} className="space-y-4">
                        {hasAnswer ? (
                          // Accordéon pour les questions avec réponses
                          <button
                            onClick={() => toggleQuestion(questionKey)}
                            className="w-full text-left group"
                          >
                            <div className="flex items-baseline gap-4">
                              <span className="font-kode text-xs text-gray-500 tracking-wider">
                                {q.index}
                              </span>
                              <h3 className="font-jetbrains text-lg font-light leading-relaxed group-hover:text-cyan-400 transition-colors duration-300" style={{ color: '#000000' }}>
                                {q.question}
                              </h3>
                              <span className="ml-auto text-cyan-400 text-lg transition-transform duration-300" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                ›
                              </span>
                            </div>
                          </button>
                        ) : (
                          // Affichage simple pour les questions sans réponses
                          <div className="flex items-baseline gap-4">
                            <span className="font-kode text-xs text-gray-500 tracking-wider">
                              {q.index}
                            </span>
                            <h3 className="font-jetbrains text-lg font-light leading-relaxed" style={{ color: '#000000' }}>
                              {q.question}
                            </h3>
                          </div>
                        )}
                        
                        {/* Réponse (accordéon) */}
                        {hasAnswer && isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="font-jetbrains text-sm text-black leading-loose pt-2 max-w-2xl space-y-3">
                              {String(q.answer)
                                .split(/(?<=[.!?])\s+(?=[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ])/)
                                .filter(s => s.trim().length > 0)
                                .map((sentence, idx) => {
                                  return (
                                    <p key={idx} className="text-justify" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}>
                                      <ShuffleText 
                                        triggerShuffle={isOpen}
                                        enableHover={false}
                                        totalDuration={800}
                                        className=""
                                      >
                                        {sentence.trim()}
                                      </ShuffleText>
                                    </p>
                                  );
                                })}
                            </div>
                          </motion.div>
                        )}
                        
                        {/* Micro-text (pour les questions sans réponses) */}
                        {!hasAnswer && q.microText && (
                          <p className="font-jetbrains text-sm text-gray-500">
                            {q.microText}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            ))}

          {/* Mobile CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6 pt-16"
          >
            <p className="font-jetbrains text-sm text-black leading-relaxed">
              Ces questions n'ont pas vocation à fournir des réponses immédiates.
              <br />
              Elles structurent la réflexion et permettent d'évaluer la pertinence et la faisabilité d'un projet, à la lumière de son contexte réel.
            </p>
            
            <a
              href="/contact"
              className="inline-block font-jetbrains text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-300 border-b border-cyan-400/30 hover:border-cyan-400/60 pb-1"
            >
              Échanger sur la pertinence du projet
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

