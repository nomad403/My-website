"use client"

import { ArrowLeft } from "lucide-react"
import LiquidGlass from "./LiquidGlass";
import HudText from "./hud-text";
import { useState } from "react";

interface ContentPagesProps {
  currentPage: string
  onBack: () => void
}

const projectList = [
  {
    id: 1,
    name: "Monday – Planificateur intelligent",
    image: "/placeholder-logo.png",
    stack: ["Kotlin", "Jetpack Compose", "Firebase", "MVVM"],
    context: "Projet personnel conçu pour répondre aux besoins d’organisation des indépendants et professionnels mobiles.",
    problem: "Planifier efficacement des journées où chaque contrainte (trafic, météo, temps d’apprentissage) peut bouleverser l’agenda. Les outils classiques manquent d’adaptabilité et de recommandations contextuelles.",
    solution: "Développement d’une application mobile de planification adaptative : l’IA ajuste l’emploi du temps en temps réel, propose des recommandations personnalisées et intègre des flows interactifs, des sliders custom et des statistiques gamifiées pour une expérience engageante.",
    impact: "Démonstration concrète d’un système IA connecté au contexte utilisateur. L’application a permis de valider des choix d’architecture modernes et d’explorer l’UX de la planification intelligente.",
  },
  {
    id: 2,
    name: "TurnUp v1.0 – Application événementielle",
    image: "/placeholder-logo.png",
    stack: ["Kotlin", "Jetpack Compose", "Firebase", "Google Maps API"],
    context: "Projet personnel dédié à la scène musicale underground, pensé pour les organisateurs et participants d’événements.",
    problem: "Créer et gérer des événements sur mesure, avec des besoins de géolocalisation et de simplicité d’usage, dans un univers où la réactivité et la confidentialité sont clés.",
    solution: "Application mobile complète : création d’événements, interface fluide, logique MVVM, intégration Google Maps et gestion des données via Firestore. L’expérience utilisateur est pensée pour la rapidité et la personnalisation.",
    impact: "Preuve de maîtrise d’un projet mobile de bout en bout : UI moderne, logique événementielle robuste, gestion cloud. L’application a servi de vitrine technique et de laboratoire UX.",
  },
  {
    id: 3,
    name: "Refrig'Air Service – Site vitrine professionnel",
    image: "/placeholder-logo.png",
    stack: ["React", "Next.js", "Vercel", "Tailwind CSS"],
    context: "Mission pour un artisan frigoriste souhaitant développer sa présence digitale et capter de nouveaux clients.",
    problem: "Absence de site web crédible, perte de prospects et difficulté à valoriser l’expertise métier en ligne.",
    solution: "Création d’un site vitrine clair, rapide et responsive, mettant en avant les services, la zone d’intervention et les atouts de l’artisan. L’architecture permet une réutilisation facile pour d’autres professionnels.",
    impact: "Crédibilité renforcée dès la mise en ligne, SEO local optimisé, outil duplicable pour d’autres artisans. Le site a généré de nouveaux contacts qualifiés dès les premières semaines.",
  },
  {
    id: 4,
    name: "AutomatIA – Automatisation IA pour le CD93",
    image: "/placeholder-logo.png",
    stack: ["Power Automate", "Azure OpenAI", "JSON", "Microsoft 365"],
    context: "Projet mené pour le Conseil départemental, secteur public, dans le cadre de la gestion administrative de l’aide à domicile (APA).",
    problem: "Surcharge administrative liée au traitement manuel d’un volume important d’e-mails et de pièces jointes, générant perte de temps et risque d’erreur.",
    solution: "Mise en place d’une automatisation IA : classement intelligent des mails, extraction d’informations des pièces jointes, réponses automatiques adaptées au contexte. Intégration fluide avec l’écosystème Microsoft 365.",
    impact: "Gain de temps significatif pour les agents, réduction des erreurs, projet pilote validant l’usage de l’IA dans un cadre public sensible. Expérience valorisante sur l’IA appliquée à des enjeux réels.",
  },
  {
    id: 5,
    name: "Portfolio Nomad403 – Identité futuriste",
    image: "/placeholder-logo.png",
    stack: ["React", "Three.js", "Canvas API", "Tailwind", "Framer Motion"],
    context: "Projet personnel de branding, destiné à affirmer une identité forte et différenciante sur le marché des développeurs indépendants.",
    problem: "Se démarquer dans un univers saturé de portfolios génériques, tout en démontrant des compétences avancées en frontend et design interactif.",
    solution: "Conception d’une navigation en croix, menu 3D interactif, effets HUD et canvas, storytelling visuel immersif. L’ensemble du site est pensé comme une expérience, à la fois technique et esthétique.",
    impact: "Mémorisation immédiate, retours très positifs de la part de clients et recruteurs, preuve de polyvalence et d’innovation. Le portfolio a généré de nouvelles opportunités et renforcé la marque personnelle.",
  },
];

export default function ContentPages({ currentPage, onBack }: ContentPagesProps) {
  const [selected, setSelected] = useState(0);

  const getPageContent = () => {
    switch (currentPage) {
      case "about":
        return (
          <div className="max-w-4xl mx-auto mt-32 px-4">
            <div className="grid grid-cols-12 gap-8">
              {/* Left side - Main content */}
              <div className="col-span-8">
                <HudText scanlines={true} duration={1.2}>ABOUT</HudText>
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
                  <HudText scanlines={true} duration={1.2}>EXPERIENCE</HudText>
                  <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                    <p>5+ années dans le développement web et mobile avec une expertise en technologies modernes</p>
                  </div>
                </div>
                <div className="p-6">
                  <HudText scanlines={true} duration={1.2}>APPROACH</HudText>
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
            <div className="max-w-6xl mx-auto mt-32 px-4">
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12">
                  <HudText scanlines={true} duration={1.2}>SPECIALIST</HudText>
                </div>
                <div className="col-span-8">
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
                            <HudText duration={0.8} className="font-kode text-base">Frontend</HudText>
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
                            <HudText duration={0.8} className="font-kode text-base">Mobile</HudText>
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
                            <HudText duration={0.8} className="font-kode text-base">Intelligence Artificielle</HudText>
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
                            <HudText duration={0.8} className="font-kode text-base">Tools</HudText>
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
                    <HudText scanlines={true} duration={1.2} className="font-kode text-lg">EXPERTISE LEVEL</HudText>
                    <div className="space-y-4">
                      {/* ...barres de compétences... */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
          
      case "projects":
        // Nouvelle disposition : 3 colonnes
        return (
          <div className="max-w-7xl mx-auto mt-32 px-4">
            <div className="grid grid-cols-12 gap-8 min-h-[600px]">
              {/* Colonne gauche : liste des projets */}
              <div className="col-span-3 flex flex-col items-start border-r border-gray-200 pr-4 relative z-[100] pointer-events-auto">
                <HudText duration={0.8} className="font-kode text-lg mb-8">PROJETS</HudText>
                {/* Liste des projets */}
                {projectList.map((proj, idx) => (
                  <button
                    key={proj.id}
                    onClick={() => setSelected(idx)}
                    className={`text-left font-kode text-base mb-4 transition-all ${selected === idx ? 'text-blue-600 scale-105' : 'text-gray-700 hover:text-blue-500'} focus:outline-none`}
                  >
                    {proj.name}
                  </button>
                ))}
              </div>

              {/* Colonne centrale : slider vertical */}
              <div className="col-span-5 flex flex-col items-center justify-center relative z-0 bg-white">
                <div className="w-full h-[420px] flex items-center justify-center overflow-hidden relative">
                  {/* Slider vertical (un seul projet visible à la fois) */}
                  <div className="w-full h-full flex flex-col items-center justify-center transition-transform duration-500" style={{ transform: `translateY(-${selected * 100}%)` }}>
                    {projectList.map((proj, idx) => (
                      <div key={proj.id} className={`w-full h-[420px] flex flex-col items-center justify-center absolute top-0 left-0 transition-opacity duration-500 ${selected === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}> 
                        <div className="w-full h-full flex items-center justify-center">
                          {/* Image ou mockup du projet */}
                          <img src={proj.image} alt={proj.name} className="rounded-xl shadow-lg max-h-80 object-contain bg-white/60" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Pagination verticale */}
                <div className="flex flex-col items-center mt-6">
                  {projectList.map((_, idx) => (
                    <button key={idx} onClick={() => setSelected(idx)} className={`w-2 h-2 rounded-full mb-2 transition-all ${selected === idx ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-blue-400'}`}></button>
                  ))}
                </div>
              </div>

              {/* Colonne droite : description détaillée */}
              <div className="col-span-4 flex flex-col items-start pl-4">
                <div className="mb-6">
                  <span className="font-kode text-lg text-blue-700">{projectList[selected].name}</span>
                  <div className="mt-2 font-mono text-xs bg-black text-green-400 px-3 py-1 rounded shadow-inner inline-block">
                    {projectList[selected].stack.map((tech, i) => (
                      <span key={tech}>{i > 0 && ' | '}<span className="">{tech}</span></span>
                    ))}
                  </div>
                </div>
                <ul className="space-y-4 font-jetbrains text-base text-[#111] leading-relaxed">
                  <li><span className="font-semibold text-blue-600">Contexte :</span> {projectList[selected].context}</li>
                  <li><span className="font-semibold text-blue-600">Problème :</span> {projectList[selected].problem}</li>
                  <li><span className="font-semibold text-blue-600">Solution :</span> {projectList[selected].solution}</li>
                  <li><span className="font-semibold text-blue-600">Impact :</span> {projectList[selected].impact}</li>
                </ul>
              </div>
            </div>
          </div>
        )

      case "contact":
        return (
          <div className="max-w-4xl mx-auto mt-32 px-4">
            <div className="grid grid-cols-12 gap-8">
              {/* Left side - Main content */}
              <div className="col-span-8">
                <HudText scanlines={true} duration={1.2} className="font-kode text-lg">CONTACT</HudText>
                <div className="p-8">
                  <HudText duration={0.8} className="font-kode">GET IN TOUCH</HudText>
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
                  <HudText scanlines={true} duration={1.2} className="font-kode text-lg">SOCIAL LINKS</HudText>
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

  return (
    <div className="relative w-full min-h-screen z-25 overflow-y-auto">
      <div className="container mx-auto px-8 py-8 min-h-full">
        

        {getPageContent()}
      </div>
    </div>
  )
}
