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
          "Un projet de site web est presque toujours la conséquence visible d’un changement plus profond. Il peut s’agir d’une évolution de l’activité, d’un repositionnement, d’une croissance mal accompagnée ou, au contraire, d’un ralentissement qui interroge. Le site devient alors le support sur lequel se concentrent des attentes multiples : visibilité, crédibilité, clarté ou performance commerciale.\n\nConsidérer le site comme le point de départ conduit souvent à des décisions trop rapides, prises sans compréhension fine du contexte. À l’inverse, identifier ce qui a déclenché le besoin permet de distinguer ce qui relève réellement du site de ce qui concerne l’offre, le discours ou l’organisation. Cette distinction conditionne la pertinence de toute décision ultérieure."
      },
      {
        index: "02",
        question: "Dans quels cas un projet numérique devient un enjeu structurant",
        answer:
          "Un projet numérique devient structurant lorsqu’il dépasse la simple question de présence en ligne et commence à engager durablement l’activité. Cela se produit notamment lorsque le site devient un point d’entrée central pour les clients, un support commercial majeur ou le socle d’outils plus larges.\n\nÀ ce stade, les décisions prises influencent non seulement le site, mais aussi la manière dont l’activité se présente, se rend compréhensible et peut évoluer. Ces projets nécessitent donc une approche plus réfléchie, orientée vers la cohérence et les conséquences à moyen terme."
      },
      {
        index: "03",
        question: "Quand le site est un symptôme plus qu’un problème",
        answer:
          "Il est fréquent qu’un site perçu comme inefficace reflète en réalité un problème plus profond : message confus, offre mal hiérarchisée ou priorités floues. Ces éléments finissent par se matérialiser dans le site, quel que soit son niveau de finition.\n\nDans ces situations, refaire le site sans revoir le cadre global revient à déplacer le problème sans le résoudre. Le site devient alors un symptôme, révélant des incohérences existantes plutôt qu’un véritable levier de transformation."
      },
      {
        index: "04",
        question: "Ce que révèlent les projets lancés par nécessité",
        answer:
          "Certains projets sont déclenchés par contrainte : site obsolète, image dégradée, difficulté à être contacté ou à être compris. Ces contextes appellent souvent une réponse rapide, mais pas nécessairement une refonte lourde.\n\nL’enjeu consiste à distinguer ce qui relève de l’urgence réelle de ce qui peut être différé. Une analyse posée permet d’éviter un surinvestissement dans des solutions inadaptées au contexte et aux objectifs réels."
      },
      {
        index: "05",
        question: "Pourquoi la question n’est pas « faut-il un site », mais « pour quoi faire »",
        answer:
          "La création ou la refonte d’un site n’est jamais une finalité en soi. La question centrale porte sur son rôle réel : rassurer, clarifier une offre, générer des contacts ou soutenir un processus commercial.\n\nTant que cette fonction n’est pas clairement définie, le projet reste fragile. Clarifier le rôle du site permet d’orienter les décisions de structure, de contenu et de priorisation, et d’éviter un site qui tente de tout faire sans remplir efficacement aucun objectif."
      },
      {
        index: "06",
        question: "Ce que je cherche à comprendre avant toute recommandation",
        answer:
          "Avant d’envisager une solution, il est essentiel de comprendre le contexte global du projet : objectifs réels, contraintes, ressources disponibles, temporalité et niveau d’exigence attendu.\n\nCe travail d’analyse permet de poser un cadre clair et d’éviter des décisions génériques. Il ne vise pas à apporter immédiatement des réponses toutes faites, mais à construire une lecture cohérente des enjeux."
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
          "Certaines décisions structurent un projet de manière durable, parfois sans que cela soit immédiatement visible. Organisation des contenus, architecture générale ou dépendances techniques font partie de ces choix qui conditionnent fortement la suite.\n\nLeur correction ultérieure est souvent possible, mais rarement simple. Les identifier dès le départ permet de limiter les ajustements coûteux et les refontes successives."
      },
      {
        index: "02",
        question: "Pourquoi certaines refontes coûtent plus qu’anticipé",
        answer:
          "Une refonte devient coûteuse lorsqu’elle vise à corriger des décisions initiales mal posées plutôt qu’à faire évoluer un projet sain. Le coût ne réside alors pas uniquement dans la technique, mais dans la remise en question du cadre global.\n\nPlus un projet avance sans fondations claires, plus les corrections ultérieures nécessitent de revenir en arrière, avec des impacts sur le budget et le planning."
      },
      {
        index: "03",
        question: "Solution simple ou évolutive : une question de contexte",
        answer:
          "Opposer solution simple et solution évolutive n’a de sens qu’en tenant compte du contexte. Une solution simple peut être parfaitement adaptée à une activité stable, tandis qu’une structure plus évolutive devient nécessaire dès lors que l’activité est appelée à se transformer.\n\nL’enjeu consiste à anticiper sans surdimensionner, en évaluant le besoin réel plutôt qu’en appliquant une règle générale."
      },
      {
        index: "04",
        question: "Quand la dette technique devient un enjeu opérationnel",
        answer:
          "La dette technique n’est pas problématique en soi. Elle le devient lorsqu’elle limite la capacité à décider, à évoluer ou à s’adapter.\n\nÀ partir de ce moment, elle cesse d’être un sujet purement technique pour devenir un enjeu opérationnel, influençant directement la conduite du projet."
      },
      {
        index: "05",
        question: "Ce que signifie réellement « prévoir l’évolution »",
        answer:
          "Prévoir l’évolution ne consiste pas à tout anticiper dès le départ, mais à éviter de se fermer des portes. Il s’agit de concevoir un cadre suffisamment clair et souple pour accueillir des évolutions sans remise en cause majeure.\n\nCette approche sécurise l’avenir sans alourdir inutilement la première version du projet."
      },
      {
        index: "06",
        question: "Pourquoi anticiper permet souvent de faire moins, mais mieux",
        answer:
          "Une réflexion en amont permet souvent de réduire le périmètre initial tout en renforçant la cohérence globale. Faire moins au départ n’est pas un compromis, mais une manière de concentrer les efforts sur ce qui est réellement structurant.\n\nCette approche favorise des projets plus lisibles, plus durables et plus faciles à faire évoluer."
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
          "Avant toute réflexion sur une solution, j’analyse les objectifs réels, les contraintes implicites, la maturité de l’activité et les ressources mobilisables. Cette lecture globale permet de comprendre ce qui est possible, pertinent et soutenable.\n\nElle évite de proposer des réponses déconnectées de la réalité du projet et de son environnement."
      },
      {
        index: "02",
        question: "Comment je distingue l’essentiel de l’accessoire",
        answer:
          "Toutes les demandes formulées dans un projet sont légitimes, mais toutes ne sont pas prioritaires. Le cadrage consiste à identifier ce qui est structurant et ce qui peut être différé sans impact négatif.\n\nCette distinction permet de concentrer les efforts sur ce qui apporte de la clarté et de la cohérence."
      },
      {
        index: "03",
        question: "Pourquoi la technologie n’est jamais le premier sujet",
        answer:
          "Aborder la technologie trop tôt conduit souvent à figer des choix avant même d’avoir clarifié le cadre. Une même technologie peut être pertinente ou inadaptée selon le contexte.\n\nElle n’a de sens qu’une fois les objectifs, contraintes et priorités clairement posés."
      },
      {
        index: "04",
        question: "Comment je hiérarchise les priorités d’un projet",
        answer:
          "Hiérarchiser revient à accepter que tout ne peut pas être traité avec la même intensité au même moment. Cette hiérarchie s’appuie sur la valeur, la complexité et les risques associés.\n\nElle permet de construire un projet lisible, avec des étapes claires et des décisions assumées."
      },
      {
        index: "05",
        question: "Ce que je choisis volontairement de ne pas faire",
        answer:
          "Dans certains projets, la solidité repose autant sur ce qui est volontairement écarté que sur ce qui est ajouté. Certaines fonctionnalités peuvent être pertinentes à terme, mais contre-productives dans une première phase.\n\nLes différer permet de préserver la cohérence et d’éviter une complexité prématurée."
      },
      {
        index: "06",
        question: "Comment un projet flou devient lisible et structuré",
        answer:
          "Un projet flou n’est pas un problème en soi. Il le devient lorsqu’aucun travail n’est fait pour en clarifier les contours.\n\nPar un travail progressif de reformulation et de hiérarchisation, il est possible de transformer ce flou initial en décisions éclairées."
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
          "Chercher à tout intégrer dès la première version fragilise souvent le projet. Cette approche conduit à des choix précipités et à une complexité inutile.\n\nUne version initiale solide repose sur la capacité à identifier l’essentiel tout en laissant de la place pour des évolutions futures."
      },
      {
        index: "02",
        question: "Quand simplifier renforce un projet",
        answer:
          "La simplification n’est pas une perte de valeur. Elle renforce la compréhension, l’usage et la cohérence globale du projet.\n\nUn projet lisible est plus facile à faire évoluer, à expliquer et à maintenir."
      },
      {
        index: "03",
        question: "Comment choisir entre plusieurs options raisonnables",
        answer:
          "Il arrive que plusieurs options soient viables. Le choix repose alors sur leur cohérence avec le contexte, les contraintes et les priorités à moyen terme.\n\nCe type de décision dépasse le cadre purement technique."
      },
      {
        index: "04",
        question: "L’intérêt d’une approche progressive et maîtrisée",
        answer:
          "Découper un projet en phases permet de sécuriser les décisions et de limiter les risques.\n\nCette approche facilite les ajustements et l’observation des usages réels."
      },
      {
        index: "05",
        question: "Pourquoi certaines décisions gagnent à être différées",
        answer:
          "Toutes les décisions n’ont pas le même degré d’urgence. Différer certaines d’entre elles permet d’éviter des choix prématurés.\n\nCette retenue contribue à une meilleure maîtrise du projet dans le temps."
      },
      {
        index: "06",
        question: "Maintenir une cohérence globale dans le temps",
        answer:
          "La cohérence repose sur des choix initiaux clairs et une attention constante aux décisions prises au fil du temps.\n\nElle permet au projet de rester lisible malgré les évolutions."
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
          "Mon intervention est pertinente lorsque le projet engage des décisions durables et nécessite une réflexion structurée avant l’exécution.\n\nDans des contextes plus simples, une approche plus directe peut suffire."
      },
      {
        index: "02",
        question: "Ce que j’apporte au-delà de la réalisation",
        answer:
          "Au-delà de la réalisation, j’apporte un cadre de réflexion et une aide à la décision.\n\nCet apport vise à sécuriser les choix effectués et à éviter des ajustements coûteux."
      },
      {
        index: "03",
        question: "Ce que je ne propose volontairement pas",
        answer:
          "Je n’interviens pas sur des projets purement exécutifs sans réflexion préalable.\n\nDans certains cas, une solution standard est plus adaptée."
      },
      {
        index: "04",
        question: "Ma place entre exécution, conseil et accompagnement",
        answer:
          "Selon le contexte, mon rôle peut aller d’un cadrage ponctuel à un accompagnement plus continu.\n\nL’objectif reste d’apporter de la clarté et de préserver la cohérence du projet."
      },
      {
        index: "05",
        question: "Comment je travaille avec des décideurs",
        answer:
          "Le travail repose sur des échanges clairs et une compréhension partagée des enjeux.\n\nLes décisions sont prises de manière éclairée et assumée."
      },
      {
        index: "06",
        question: "Ce que signifie concrètement travailler ensemble",
        answer:
          "Travailler ensemble implique un engagement réciproque, une transparence et un respect du cadre défini.\n\nCes conditions permettent d’avancer sereinement."
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
          "Mon approche est adaptée lorsque le projet nécessite une réflexion approfondie avant l’exécution.\n\nElle s’adresse à des projets engageant l’activité au-delà du court terme."
      },
      {
        index: "02",
        question: "Quand elle ne l’est probablement pas",
        answer:
          "Elle l’est moins lorsque le besoin est strictement opérationnel ou entièrement défini à l’avance.\n\nDans ces cas, une intervention plus directe est souvent plus pertinente."
      },
      {
        index: "03",
        question: "À quoi sert un premier échange",
        answer:
          "Un premier échange permet de vérifier l’adéquation entre le contexte du projet et mon approche.\n\nIl vise à poser un premier cadre, sans engagement prématuré."
      },
      {
        index: "04",
        question: "Ce que j’attends avant de m’engager",
        answer:
          "Avant tout engagement, j’attends une compréhension claire des enjeux, des contraintes et des attentes.\n\nCette clarté est indispensable pour éviter toute ambiguïté."
      },
      {
        index: "05",
        question: "Les conditions d’une collaboration saine",
        answer:
          "Une collaboration saine repose sur la confiance, la transparence et la capacité à prendre des décisions partagées.\n\nCes éléments sécurisent le projet."
      },
      {
        index: "06",
        question: "Pourquoi la clarté prime toujours sur la promesse",
        answer:
          "La clarté permet de construire des projets durables.\n\nLes promesses non fondées fragilisent les décisions, tandis qu’un cadre clair les sécurise."
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

