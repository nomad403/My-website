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
    label: "Pourquoi ce projet ?",
    questions: [
      {
        index: "01",
        question: "Pourquoi créer ou refaire un site web aujourd'hui ?",
        answer:
          "Créer ou refaire un site web n’est jamais un objectif en soi. En général, ce besoin apparaît parce que quelque chose a changé : ton activité a évolué, ton site actuel ne te ressemble plus, ou il ne remplit plus son rôle. La vraie question n’est donc pas « est-ce qu’il me faut un site », mais « pourquoi maintenant ». Clarifier ce point permet de lancer une création ou une refonte de site web utile, et pas simplement un site « propre »."
      },
      {
        index: "02",
        question: "Quel problème ce site web doit-il résoudre concrètement ?",
        answer:
          "Un site web efficace répond toujours à un problème précis. Cela peut être un manque de visibilité, des demandes peu qualifiées, une activité difficile à comprendre, ou un site internet existant qui ne génère aucun contact. Identifier ce problème dès le départ évite de se concentrer uniquement sur le design. Un bon projet de création de site web ou de refonte commence toujours par cette clarification."
      },
      {
        index: "03",
        question: "Qu'est-ce que ton site actuel ne permet pas de faire ?",
        answer:
          "Si tu as déjà un site internet, il est important d’identifier ses limites. Est-ce qu’il manque de clarté ? Est-il difficile à mettre à jour ? Donne-t-il une image vraiment professionnelle ? Cette réflexion permet de savoir si une amélioration suffit ou si une refonte de site internet plus structurée est nécessaire. Dans certains cas, le site n’est qu’un symptôme : il révèle un besoin plus large de clarification ou d’outils."
      },
      {
        index: "04",
        question: "Cherches-tu une simple présence en ligne ou un site web qui apporte des résultats ?",
        answer:
          "Tous les sites web n’ont pas le même rôle. Certains servent principalement à exister et rassurer, d’autres doivent générer des demandes, des prises de rendez-vous ou soutenir une activité commerciale. Clarifier cette différence est essentiel, car elle influence la structure du site web, les contenus et les appels à l’action. Un site web professionnel orienté résultats ne se construit pas de la même façon qu’un site vitrine basique."
      },
      {
        index: "05",
        question: "Pourquoi ce projet arrive-t-il à ce moment précis ?",
        answer:
          "Le timing d’un projet de site web est souvent révélateur. Il peut être lié à un lancement d’activité, à une évolution de ton offre, ou à des retours répétés de clients qui cherchent des informations en ligne. Comprendre ce déclencheur aide à prioriser l’essentiel et à éviter de partir sur un projet trop large. Parfois, une création de site web simple et bien cadrée suffit ; parfois, une refonte est plus adaptée."
      },
      {
        index: "06",
        question: "Ce projet de site web répond-il à une contrainte ou à une ambition ?",
        answer:
          "Certains projets sont lancés par nécessité : site obsolète, absence de présence en ligne, manque de crédibilité. D’autres sont portés par une ambition plus forte : mieux se positionner, structurer l’activité, préparer une croissance. Cette distinction est importante, car elle conditionne le type d’accompagnement à rechercher, qu’il s’agisse d’un freelance développeur web, d’une agence web, ou d’une approche progressive par étapes."
      }
    ]
  },
  {
    id: 2,
    label: "À quoi doit servir le site ?",
    questions: [
      {
        index: "01",
        question: "Quel rôle ce site web doit-il réellement jouer ?",
        answer:
          "Un site web professionnel peut avoir plusieurs rôles : vitrine pour rassurer, support commercial pour clarifier l’offre, ou outil pour générer des demandes. Identifier le rôle principal évite de disperser les efforts et d’empiler des pages inutiles. Un site qui doit obtenir des contacts ne se structure pas comme un site qui sert uniquement à informer. Cette décision oriente la création du site web, son architecture et sa stratégie de contenu."
      },
      {
        index: "02",
        question: "Quels objectifs concrets ce site web doit-il atteindre ?",
        answer:
          "Définir des objectifs concrets permet d’évaluer la réussite du projet. Cela peut être des demandes de devis, des prises de rendez-vous, des appels, ou du trafic qualifié sur des pages clés. Sans objectifs, une création ou une refonte de site reste difficile à piloter. Ces indicateurs aident aussi à choisir quoi faire en premier, puis quoi optimiser après la mise en ligne."
      },
      {
        index: "03",
        question: "Ce site doit-il surtout informer ou convertir ?",
        answer:
          "La différence est simple : informer, c’est rendre ton activité compréhensible et rassurante ; convertir, c’est guider vers une action (contact, devis, rendez-vous). Un site internet orienté conversion nécessite des pages structurées, des preuves (réalisations, avis, cas), et des appels à l’action placés intelligemment. Un site informatif mise plutôt sur la clarté, la hiérarchie des informations et la navigation."
      },
      {
        index: "04",
        question: "Quelles actions un visiteur doit-il pouvoir faire facilement ?",
        answer:
          "Le type d’action attendu détermine les fonctionnalités réellement utiles. Certains sites sont purement consultatifs, d’autres doivent permettre une prise de rendez-vous, une demande de devis, un téléchargement, ou un achat. Plus l’interaction est exigeante, plus la conception du site web doit être robuste et cohérente. Cette étape évite de sur-développer des fonctionnalités qui ne serviront pas."
      },
      {
        index: "05",
        question: "Le contenu doit-il être mis à jour souvent ou rarement ?",
        answer:
          "Un site web peut rester stable pendant des mois, ou nécessiter des mises à jour régulières (offres, actualités, références, contenus). Cette réalité influence le choix de la solution : site simple, CMS, ou approche plus sur mesure. Elle détermine aussi ton niveau d’autonomie : est-ce que tu veux pouvoir modifier le site internet toi-même, ou déléguer ? Clarifier ça dès le départ évite des choix techniques inutiles."
      },
      {
        index: "06",
        question: "Quel est le parcours idéal d’un visiteur sur ton site ?",
        answer:
          "Définir un parcours utilisateur simple permet de structurer la page d’accueil et l’ensemble du site web. Un visiteur doit-il d’abord comprendre l’activité, puis voir des preuves, puis contacter ? Ou doit-il accéder directement à un service précis ? Cette réflexion guide l’architecture de l’information et l’ordre des contenus, ce qui améliore à la fois l’expérience et le référencement naturel."
      }
    ]
  },
  {
    id: 3,
    label: "Quel type de solution ?",
    questions: [
      {
        index: "01",
        question: "Ce site web doit-il pouvoir évoluer dans le temps ?",
        answer:
          "Un site web peut être pensé comme une version stable, ou comme une base évolutive. Si ton activité est stable, une structure simple peut suffire. Si ton offre évolue, le site doit pouvoir s’adapter : nouveaux services, nouvelles pages, intégrations futures. Anticiper cette évolution influence la création du site internet et évite une refonte trop tôt. Dans beaucoup de cas, le site est la première brique d’un dispositif numérique plus large."
      },
      {
        index: "02",
        question: "As-tu besoin d’un CMS pour gérer le contenu toi-même ?",
        answer:
          "Un CMS permet de modifier certains contenus sans compétence technique, ce qui est utile si les informations changent régulièrement (offre, tarifs, actualités, références). Si le contenu est stable, un site plus simple peut être plus rapide, plus léger et plus facile à maintenir. Le choix dépend surtout de ta fréquence de mise à jour et du niveau d’autonomie souhaité. L’objectif est d’éviter une solution trop complexe pour un besoin simple."
      },
      {
        index: "03",
        question: "Faut-il intégrer des outils externes (CRM, paiement, réservation) ?",
        answer:
          "L’intégration d’outils externes peut apporter beaucoup de valeur : synchronisation avec un CRM, paiement en ligne, réservation, formulaire avancé, ou connexion à des services métier. Mais ces intégrations augmentent la complexité d’un site web sur mesure et demandent une maintenance adaptée. La bonne question est : est-ce indispensable dès la première version, ou est-ce une évolution prévue plus tard ? Cela aide à cadrer le périmètre et le budget."
      },
      {
        index: "04",
        question: "Le site doit-il être multilingue dès le départ ?",
        answer:
          "Un site multilingue demande une organisation précise : structure des pages, traduction, cohérence des contenus et optimisation du référencement par langue. Cela peut aussi ajouter des contraintes de contenu et de maintenance. Si l’international n’est pas une priorité immédiate, il est souvent plus raisonnable de préparer le terrain sans tout lancer dès la V1. L’objectif est de ne pas alourdir la création du site web inutilement."
      },
      {
        index: "05",
        question: "Quel niveau de performance et de rapidité est attendu ?",
        answer:
          "La performance d’un site web influence directement l’expérience et le référencement. Un site lent perd des visiteurs et convertit moins bien, même si le design est réussi. Les exigences dépendent de l’usage : vitrine simple, site avec contenus riches, ou site avec fonctionnalités avancées. Clarifier ce niveau attendu permet d’adapter la solution technique, l’hébergement et les optimisations dès le début de la création ou de la refonte."
      },
      {
        index: "06",
        question: "Le site doit-il être pensé mobile-first ?",
        answer:
          "Aujourd’hui, une grande partie du trafic arrive depuis le mobile. Un site responsive est donc la base, mais l’enjeu réel est : est-ce que l’expérience mobile doit être prioritaire ? Selon ton secteur, les visiteurs peuvent consulter et contacter depuis leur téléphone. Penser mobile-first influence la hiérarchie des contenus, la navigation et la conversion. C’est un choix de conception, pas un détail technique."
      }
    ]
  },
  {
    id: 4,
    label: "Quel niveau d'engagement ?",
    questions: [
      {
        index: "01",
        question: "Quel niveau d’investissement est cohérent avec tes objectifs ?",
        answer:
          "L’investissement doit être proportionnel à ce que tu attends du site web. Un site vitrine simple peut suffire pour une présence en ligne professionnelle. Un site web sur mesure, avec une identité forte, une stratégie de conversion et des intégrations, demande plus de temps et de budget. L’objectif est d’aligner attentes et réalité : vouloir un résultat ambitieux avec un budget minimal mène souvent à des compromis invisibles… jusqu’à la mise en ligne."
      },
      {
        index: "02",
        question: "Quel budget veux-tu consacrer à la création ou la refonte du site ?",
        answer:
          "Parler budget n’est pas une question de prix “au hasard”, c’est une question de périmètre. Un budget serré oriente vers une version plus simple, ou un lancement par étapes. Un budget plus confortable permet un design plus travaillé, une meilleure structure, et des fonctionnalités utiles. Être clair sur ce point évite les malentendus et permet de proposer une solution cohérente, que ce soit avec un freelance ou une agence."
      },
      {
        index: "03",
        question: "Préférerais-tu un lancement complet ou une version initiale évolutive ?",
        answer:
          "Un lancement complet vise un site abouti dès le départ. Une approche progressive consiste à créer une première version solide, puis à améliorer en fonction des retours et des priorités. Cette méthode est souvent plus efficace quand le budget est limité ou quand le besoin n’est pas totalement stabilisé. Elle réduit le risque de sur-investir dans des fonctionnalités inutiles dès la V1, tout en gardant un site web professionnel."
      },
      {
        index: "04",
        question: "Quel est le coût de ne pas avoir (ou de garder) ce site tel qu’il est ?",
        answer:
          "Parfois, le vrai coût n’est pas le projet, mais l’inaction : opportunités perdues, prospects qui ne te contactent pas, manque de crédibilité, temps perdu à répéter les mêmes explications. Évaluer ce coût aide à mesurer l’intérêt d’une création ou d’une refonte de site internet. Si l’impact est réel, investir dans un site web mieux structuré devient une décision rationnelle, pas une dépense “marketing”."
      },
      {
        index: "05",
        question: "As-tu prévu un minimum de budget pour la maintenance et les évolutions ?",
        answer:
          "Un site web n’est pas un objet figé : il nécessite au minimum un hébergement fiable, des mises à jour de sécurité (selon la solution), et parfois des ajustements. Même un site simple doit rester sain et à jour. Prévoir un petit budget de maintenance évite les mauvaises surprises et protège la qualité du projet dans le temps. C’est souvent ce qui fait la différence entre un site durable et un site abandonné."
      },
      {
        index: "06",
        question: "Quel retour sur investissement attends-tu de ce site web ?",
        answer:
          "Le ROI dépend du rôle du site. Pour une vitrine, il peut être indirect : crédibilité, image professionnelle, clarté. Pour un site orienté acquisition, il peut être plus mesurable : nombre de demandes, taux de conversion, leads qualifiés. Avoir une attente réaliste permet de dimensionner correctement la création du site web et d’identifier ce qu’il faudra mesurer et améliorer après la mise en ligne."
      }
    ]
  },
  {
    id: 5,
    label: "Avec qui travailler ?",
    questions: [
      {
        index: "01",
        question: "As-tu besoin d’un exécutant ou d’un partenaire ?",
        answer:
          "Un exécutant suit des instructions précises et livre un résultat défini. Un partenaire aide à cadrer, poser les bonnes questions, et proposer des solutions adaptées au contexte. Pour un projet simple et déjà bien défini, un exécutant peut suffire. Pour une création ou une refonte de site web où les objectifs ne sont pas encore clairs, un partenaire apporte une vraie valeur. Cette distinction influence directement le résultat final."
      },
      {
        index: "02",
        question: "Quel niveau d’accompagnement veux-tu pendant le projet ?",
        answer:
          "Certains projets demandent uniquement de la réalisation technique. D’autres nécessitent de l’accompagnement : clarification des besoins, structuration des pages, amélioration du parcours, conseils sur le contenu et le référencement. Plus l’enjeu est important, plus cet accompagnement devient utile. La bonne question est : veux-tu simplement “un site”, ou un site web professionnel pensé comme un outil ?"
      },
      {
        index: "03",
        question: "Freelance développeur web ou agence : qu’est-ce qui te convient le mieux ?",
        answer:
          "Un freelance développeur web offre souvent un contact direct, plus de souplesse et une forte réactivité. Une agence web apporte une équipe, des processus établis, et peut absorber des projets plus larges. Le bon choix dépend du périmètre, du délai, et du besoin d’interlocuteurs multiples ou d’un point de contact unique. L’essentiel est d’avoir une collaboration claire et un niveau de qualité aligné avec tes objectifs."
      },
      {
        index: "04",
        question: "La proximité géographique (ex. Paris) est-elle vraiment importante ?",
        answer:
          "La proximité peut aider si tu veux des échanges en présentiel, surtout en phase de cadrage. Mais aujourd’hui, un projet de création de site web peut très bien se gérer à distance avec des outils efficaces. La question n’est pas tant la distance que la qualité des échanges et la clarté du processus. Si la proximité apporte une valeur réelle, elle peut compter ; sinon, elle ne doit pas être le critère principal."
      },
      {
        index: "05",
        question: "Quelles compétences sont réellement nécessaires pour ce site ?",
        answer:
          "Un site web peut nécessiter des compétences très différentes : design, intégration, développement, SEO, performance, ou intégration d’outils externes. Un projet simple peut être géré par un profil polyvalent ; un projet plus ambitieux peut demander plusieurs expertises. Clarifier les besoins évite de payer pour des compétences inutiles, ou au contraire de sous-estimer la complexité d’une refonte de site internet."
      },
      {
        index: "06",
        question: "Quel niveau de réactivité et de disponibilité attends-tu ?",
        answer:
          "Les attentes sur la réactivité doivent être claires dès le départ. Une création de site web avec une date de lancement précise demande plus de disponibilité, des validations rapides et un rythme soutenu. Un projet plus flexible permet un calendrier plus confortable. Le but est d’éviter les frustrations : si l’un attend une livraison rapide et l’autre un rythme plus lent, le projet se dégrade."
      }
    ]
  },
  {
    id: 6,
    label: "Est-ce le bon moment ?",
    questions: [
      {
        index: "01",
        question: "Es-tu prêt à lancer ce projet de site web correctement ?",
        answer:
          "Lancer un projet de site web demande un minimum de disponibilité : échanges, validations, retours sur les maquettes, et décisions rapides. Si tu n’as pas le temps ou l’énergie, le projet risque de s’étirer et de perdre en qualité. Il vaut parfois mieux attendre quelques semaines et démarrer dans de bonnes conditions. Un site web professionnel se construit plus facilement quand le cadre est clair."
      },
      {
        index: "02",
        question: "As-tu le contenu nécessaire pour alimenter le site ?",
        answer:
          "Un site internet a besoin de contenu : texte, images, description des services, preuves (réalisations, avis), et informations pratiques. Si rien n’est prêt, le projet peut être bloqué ou livré “vide”, ce qui réduit son impact. La bonne approche consiste à identifier l’essentiel pour la V1, puis à enrichir. Selon le cas, tu peux produire ce contenu en interne ou te faire accompagner."
      },
      {
        index: "03",
        question: "Ton activité est-elle suffisamment claire pour être présentée ?",
        answer:
          "Un site web met en mots une activité. Si ton offre est encore floue, le site risque d’être confus, et tu devras le modifier très vite. Le but n’est pas d’être parfait, mais d’avoir une proposition suffisamment stable. Dans le cas contraire, une approche par étapes (site simple d’abord, puis évolution) évite une refonte prématurée."
      },
      {
        index: "04",
        question: "Y a-t-il une date limite ou un lancement à respecter ?",
        answer:
          "Une deadline change la stratégie. Si tu dois sortir rapidement (lancement, événement, campagne), il peut être préférable de viser une première version plus simple et solide, plutôt qu’un projet trop ambitieux. Accélérer un projet de création de site web demande souvent plus de budget, plus de disponibilité, ou des compromis. L’important est de choisir une approche réaliste pour respecter la date sans sacrifier la qualité."
      },
      {
        index: "05",
        question: "As-tu les ressources pour maintenir le site après la mise en ligne ?",
        answer:
          "Après la mise en ligne, un site web vit : petites corrections, évolutions, mise à jour du contenu, et parfois sécurité selon la solution choisie. Si tu n’as pas les ressources (temps, budget, organisation), le site peut se dégrader et devenir obsolète. Prévoir un minimum de maintenance, même simple, protège l’investissement. C’est un point souvent sous-estimé dans les projets de création ou refonte."
      },
      {
        index: "06",
        question: "Ce projet est-il une priorité maintenant, ou peut-il attendre ?",
        answer:
          "Tous les projets ne sont pas urgents. Si tu n’as pas de besoin clair, pas de temps, ou pas de budget cohérent, il est souvent préférable d’attendre plutôt que de lancer un projet par obligation. À l’inverse, si ton site actuel te pénalise réellement, remettre à plus tard coûte parfois plus cher. L’objectif est de choisir le bon moment pour maximiser l’impact de la création ou de la refonte du site web."
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
      const next = new Set(prev)
      if (next.has(questionKey)) {
        next.delete(questionKey)
      } else {
        next.add(questionKey)
      }
      return next
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
                              <p className="font-jetbrains text-sm text-black leading-relaxed pt-2">
                                <ShuffleText 
                                  triggerShuffle={isOpen}
                                  enableHover={false}
                                  totalDuration={800}
                                  className=""
                                >
                                  {String(q.answer)}
                                </ShuffleText>
                              </p>
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
                  Ces questions structurent la réflexion sans imposer de réponse. 
                  Elles servent de base pour évaluer la pertinence et la faisabilité du projet.
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
      <div className="lg:hidden px-4 sm:px-6 pt-20 pb-32">
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
                            className="ml-12 overflow-hidden"
                          >
                            <p className="font-jetbrains text-sm text-black leading-relaxed pt-2">
                              <ShuffleText 
                                triggerShuffle={isOpen}
                                enableHover={false}
                                totalDuration={800}
                                className=""
                              >
                                {String(q.answer)}
                              </ShuffleText>
                            </p>
                          </motion.div>
                        )}
                        
                        {/* Micro-text (pour les questions sans réponses) */}
                        {!hasAnswer && q.microText && (
                          <p className="font-jetbrains text-sm text-gray-500 ml-12">
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
              Ces questions structurent la réflexion sans imposer de réponse. 
              Elles servent de base pour évaluer la pertinence et la faisabilité du projet.
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

