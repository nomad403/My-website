"use client"

import { ArrowLeft } from "lucide-react"
import LiquidGlass from "./LiquidGlass";
import LiquidGlassBackground from "./LiquidGlassBackground";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ShuffleText from "./ShuffleText";
import SphereAlignedProjectList from "./SphereAlignedProjectList";

interface ContentPagesProps {
  currentPage: string
  onBack: () => void
}

const projectList = [
  {
    id: 1,
    name: "Monday",
    images: [
      "/images/monday.png"
    ],
    stack: ["Kotlin", "Jetpack Compose", "Firebase", "MVVM"],
    description: "Les journées ne suivent jamais le plan. Elles dérapent, s'accélèrent, changent d'ordre. Monday transforme cette réalité en avantage. L’app anticipe les imprévus, réajuste vos priorités en temps réel, et orchestre votre journée avec une logique aussi souple que précise. Pas de surcharge mentale, pas de friction. Juste un agenda qui s’adapte à vous, naturellement.",
    context: "Projet personnel conçu pour répondre aux besoins d'organisation des indépendants et professionnels mobiles.",
    problem: "Planifier efficacement des journées où chaque contrainte (trafic, météo, temps d'apprentissage) peut bouleverser l'agenda. Les outils classiques manquent d'adaptabilité et de recommandations contextuelles.",
    solution: "Développement d'une application mobile de planification adaptative : l'IA ajuste l'emploi du temps en temps réel, propose des recommandations personnalisées et intègre des flows interactifs, des sliders custom et des statistiques gamifiées pour une expérience engageante.",
    impact: "Démonstration concrète d'un système IA connecté au contexte utilisateur. L'application a permis de valider des choix d'architecture modernes et d'explorer l'UX de la planification intelligente.",
  },
  {
    id: 2,
    name: "TurnUpSphere",
    images: [
      "/images/turnupsphere.png"
    ],
    stack: ["Kotlin", "Jetpack Compose", "Firebase", "Google Maps API"],
    description: "Application mobile dédiée à la scène musicale underground, pensée pour les organisateurs et participants d'événements. Elle permet de créer et gérer des événements sur mesure avec géolocalisation, interface fluide et gestion cloud, dans un univers où la réactivité et la confidentialité sont clés.",
    context: "Projet personnel dédié à la scène musicale underground, pensé pour les organisateurs et participants d'événements.",
    problem: "Créer et gérer des événements sur mesure, avec des besoins de géolocalisation et de simplicité d'usage, dans un univers où la réactivité et la confidentialité sont clés.",
    solution: "Application mobile complète : création d'événements, interface fluide, logique MVVM, intégration Google Maps et gestion des données via Firestore. L'expérience utilisateur est pensée pour la rapidité et la personnalisation.",
    impact: "Preuve de maîtrise d'un projet mobile de bout en bout : UI moderne, logique événementielle robuste, gestion cloud. L'application a servi de vitrine technique et de laboratoire UX.",
  },
  {
    id: 3,
    name: "Refrig'Air Services",
    images: [
      "/images/refrig_air_services.png"
    ],
    stack: ["React", "Next.js", "Vercel", "Tailwind CSS"],
    description: "Site vitrine clair, rapide et responsive pour un artisan frigoriste, mettant en avant les services, la zone d'intervention et les atouts métier. L'architecture permet une réutilisation facile pour d'autres professionnels et a généré de nouveaux contacts qualifiés dès les premières semaines.",
    context: "Mission pour un artisan frigoriste souhaitant développer sa présence digitale et capter de nouveaux clients.",
    problem: "Absence de site web crédible, perte de prospects et difficulté à valoriser l'expertise métier en ligne.",
    solution: "Création d'un site vitrine clair, rapide et responsive, mettant en avant les services, la zone d'intervention et les atouts de l'artisan. L'architecture permet une réutilisation facile pour d'autres professionnels.",
    impact: "Crédibilité renforcée dès la mise en ligne, SEO local optimisé, outil duplicable pour d'autres artisans. Le site a généré de nouveaux contacts qualifiés dès les premières semaines.",
  },
  {
    id: 4,
    name: "AutomatIA",
    images: [
      "/images/seine_saint_denis.jpg"
    ],
    stack: ["Power Automate", "Azure OpenAI", "JSON", "Microsoft 365"],
    description: "Automatisation IA pour le secteur public : classement intelligent des mails, extraction d'informations, réponses automatiques adaptées au contexte. Gain de temps significatif pour les agents et validation de l'usage de l'IA dans un cadre public sensible.",
    context: "Projet mené pour le Conseil départemental, secteur public, dans le cadre de la gestion administrative de l'aide à domicile (APA).",
    problem: "Gestion manuelle chronophage des mails et des pièces jointes, risque d'erreurs et surcharge de travail pour les agents.",
    solution: "Mise en place d'une automatisation IA : classement intelligent des mails, extraction d'informations des pièces jointes, réponses automatiques adaptées au contexte. Intégration fluide avec l'écosystème Microsoft 365.",
    impact: "Gain de temps significatif pour les agents, réduction des erreurs, projet pilote validant l'usage de l'IA dans un cadre public sensible. Expérience valorisante sur l'IA appliquée à des enjeux réels.",
  },
  {
    id: 5,
    name: "Portfolio Nomad403",
    images: [
      "/placeholder-logo.png"
    ],
    stack: ["React", "Three.js", "Canvas API", "Tailwind", "Framer Motion"],
    description: "Portfolio interactif et immersif, pensé comme une expérience technique et esthétique. Navigation 3D, effets HUD, storytelling visuel et démonstration de compétences avancées en frontend et design interactif.",
    context: "Projet personnel de branding, destiné à affirmer une identité forte et différenciante sur le marché des développeurs indépendants.",
    problem: "Se démarquer dans un univers saturé de portfolios génériques, tout en démontrant des compétences avancées en frontend et design interactif.",
    solution: "Conception d'une navigation en croix, menu 3D interactif, effets HUD et canvas, storytelling visuel immersif. L'ensemble du site est pensé comme une expérience, à la fois technique et esthétique.",
    impact: "Mémorisation immédiate, retours très positifs de la part de clients et recruteurs, preuve de polyvalence et d'innovation. Le portfolio a généré de nouvelles opportunités et renforcé la marque personnelle.",
  },
];

export default function ContentPages({ currentPage, onBack }: ContentPagesProps) {
  const [selected, setSelected] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0); // Nouvel état pour la navigation entre images
  // Ajoute un état pour mémoriser l'index précédent
  const [prevSelected, setPrevSelected] = useState(0);

  const getPageContent = () => {
    switch (currentPage) {
             case "about":
         return (
           <div className="max-w-4xl mx-auto mt-32 px-8">
            <div className="grid grid-cols-12 gap-8">
              {/* Left side - Main content */}
              <div className="col-span-8">
                <div className="space-y-8">
                  <div className="p-8">
                    <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                      <p>Développeur passionné par les technologies modernes et l'innovation digitale.</p>
                      <p>Spécialisé dans le développement frontend, mobile et l'intégration d'intelligence artificielle, je crée des expériences utilisateur exceptionnelles et des solutions techniques sur-mesure.</p>
                      <p>Mon approche combine créativité technique et performance pour donner vie à vos projets les plus ambitieux.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Stats/Info */}
              <div className="col-span-4 space-y-6">
                <div className="p-6">
                  <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                    <p>5+ années dans le développement web et mobile avec une expertise en technologies modernes</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                    <p>Méthodologie agile, code propre et focus sur l'expérience utilisateur</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

                 case "skills":
           return (
             <div className="max-w-6xl mx-auto mt-32 px-8">
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12">
                  <div className="wrapper">
                    <div className="grid grid-cols-2 gap-12">
                      {/* Bloc Frontend */}
                      <div className="liquidGlass-wrapper menu">
                        <div className="liquidGlass-effect"></div>
                        <div className="liquidGlass-tint"></div>
                        <div className="liquidGlass-shine"></div>
                        <div className="liquidGlass-text">
                          <div className="flex items-center mb-6">
                            <div className="font-kode text-base text-blue-600 mr-4 hud-text">{'</>'}</div>
                            <div className="font-kode text-base">Frontend</div>
                          </div>
                          <ul className="space-y-2 font-jetbrains text-sm text-[#111] leading-relaxed list-disc pl-6 mb-4">
                            <li>React / Next.js</li>
                            <li>TypeScript / JavaScript</li>
                            <li>Tailwind CSS</li>
                            <li>Three.js / WebGL</li>
                            <li>Animations & Interactions</li>
                          </ul>
                        </div>
                      </div>
                      {/* Bloc Mobile */}
                      <div className="liquidGlass-wrapper menu">
                        <div className="liquidGlass-effect"></div>
                        <div className="liquidGlass-tint"></div>
                        <div className="liquidGlass-shine"></div>
                        <div className="liquidGlass-text">
                          <div className="flex items-center mb-6">
                            <div className="font-kode text-base text-green-600 mr-4 hud-text">[#]</div>
                            <div className="font-kode text-base">Mobile</div>
                          </div>
                          <ul className="space-y-2 font-jetbrains text-sm text-[#111] leading-relaxed list-disc pl-6 mb-4">
                            <li>React Native</li>
                            <li>Flutter</li>
                            <li>Applications hybrides</li>
                            <li>Intégration API</li>
                            <li>Notifications push</li>
                          </ul>
                        </div>
                      </div>
                      {/* Bloc Intelligence Artificielle */}
                      <div className="liquidGlass-wrapper menu">
                        <div className="liquidGlass-effect"></div>
                        <div className="liquidGlass-tint"></div>
                        <div className="liquidGlass-shine"></div>
                        <div className="liquidGlass-text">
                          <div className="flex items-center mb-6">
                            <div className="font-kode text-base text-purple-600 mr-4 hud-text">[AI]</div>
                            <div className="font-kode text-base">Intelligence Artificielle</div>
                          </div>
                          <ul className="space-y-2 font-jetbrains text-sm text-[#111] leading-relaxed list-disc pl-6 mb-4">
                            <li>Intégration OpenAI GPT</li>
                            <li>Vision par ordinateur</li>
                            <li>Chatbots intelligents</li>
                            <li>Outils d'automatisation</li>
                            <li>Machine Learning</li>
                          </ul>
                        </div>
                      </div>
                      {/* Bloc Tools */}
                      <div className="liquidGlass-wrapper menu">
                        <div className="liquidGlass-effect"></div>
                        <div className="liquidGlass-tint"></div>
                        <div className="liquidGlass-shine"></div>
                        <div className="liquidGlass-text">
                          <div className="flex items-center mb-6">
                            <div className="font-kode text-base text-yellow-600 mr-4 hud-text">{'{}'}</div>
                            <div className="font-kode text-base">Tools</div>
                          </div>
                          <ul className="space-y-2 font-jetbrains text-sm text-[#111] leading-relaxed list-disc pl-6 mb-4">
                            <li>Git / GitHub</li>
                            <li>Docker & CI/CD</li>
                            <li>Méthodes Agiles</li>
                            <li>Tests automatisés</li>
                            <li>Optimisation performance</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right sidebar */}
                <div className="col-span-4">
                  <div className="p-6">
                    <div className="font-kode text-lg">EXPERTISE LEVEL</div>
                    <div className="space-y-4">
                      {/* ...barres de compétences... */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
          
      case "projects":
        return (
          <div className="relative w-full h-screen overflow-hidden">
            {/* Liste des projets en arc alignée avec la sphère */}
            <SphereAlignedProjectList
              projects={projectList}
              selected={selected}
              onSelect={(idx) => {
                setPrevSelected(selected);
                setSelected(idx);
                setSelectedImage(0);
              }}
              maxVisible={7}
            />

                         {/* Image à droite */}
             <div className="absolute right-24 top-1/2 transform -translate-y-1/2 pointer-events-auto">
               <div className="w-[26rem] max-w-[45vw] h-[55vh] max-h-[450px] flex items-center justify-center">
                 <AnimatePresence mode="wait" initial={false}>
                   <motion.div
                     key={projectList[selected].images[selectedImage]}
                     initial={{ y: 60, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: -60, opacity: 0 }}
                     transition={{ duration: 0.5, ease: "easeInOut" }}
                     className="rounded-xl shadow-lg overflow-hidden bg-white/10 backdrop-blur-sm max-w-full max-h-full"
                   >
                     <img
                       src={projectList[selected].images[selectedImage]}
                       alt={projectList[selected].name}
                       className="w-full h-full object-contain"
                       onLoad={(e) => {
                         const img = e.target as HTMLImageElement;
                         const container = img.parentElement;
                         if (container) {
                           const aspectRatio = img.naturalWidth / img.naturalHeight;
                           container.style.aspectRatio = aspectRatio.toString();
                         }
                       }}
                     />
                   </motion.div>
                 </AnimatePresence>
               </div>
             </div>
          </div>
        )

             case "contact":
         return (
           <div className="max-w-4xl mx-auto mt-32 px-8">
            <div className="grid grid-cols-12 gap-8">
              {/* Left side - Main content */}
              <div className="col-span-8">
                <div className="font-kode text-lg">CONTACT</div>
                <div className="p-8">
                  <div className="font-kode">GET IN TOUCH</div>
                  <div className="space-y-3 font-jetbrains text-sm font-light mt-8">
                    <div>
                      <span className="text-blue-600 uppercase tracking-wide">Email</span>
                      <span className="block mt-1">contact@nomad403.dev</span>
                    </div>
                    <div>
                      <span className="text-blue-600 uppercase tracking-wide">Phone</span>
                      <span className="block mt-1">+33 (0)1 23 45 67 89</span>
                    </div>
                    <div>
                      <span className="text-blue-600 uppercase tracking-wide">Location</span>
                      <span className="block mt-1">France, Remote Available</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right side - Social links */}
              <div className="col-span-4 space-y-6">
                <div className="p-8">
                  <div className="font-kode text-lg">SOCIAL LINKS</div>
                  <div className="space-y-3 font-jetbrains text-sm font-light mt-8">
                    <div>
                      <span className="text-green-600 uppercase tracking-wide">LinkedIn</span>
                      <span className="block mt-1">/in/nomad403</span>
                    </div>
                    <div>
                      <span className="text-green-600 uppercase tracking-wide">GitHub</span>
                      <span className="block mt-1">/nomad403</span>
                    </div>
                    <div>
                      <span className="text-green-600 uppercase tracking-wide">Twitter</span>
                      <span className="block mt-1">@nomad403</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Détermine la direction du slide
  const slideDirection = selected > prevSelected ? 1 : -1;

     return (
     <div className="relative w-full h-screen z-20 overflow-hidden">
       <div className="w-full h-full">
        

        {getPageContent()}
      </div>
    </div>
  )
}
