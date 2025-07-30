"use client"

import { ArrowLeft } from "lucide-react"

import { useState } from "react";
import SphereAlignedProjectList from "./SphereAlignedProjectList";
import CylinderCarousel from "./CylinderCarousel";
import StarField from "./StarField";

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
       "/images/turnupsphere.png",
       "/placeholder-logo.png"
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
             

                                  case "skills":
          return (
            <div className="relative w-full h-screen overflow-hidden">
              {/* Ciel étoilé interactif avec mouse tracking - chargement optimisé */}
              <StarField />
            </div>
          )
          
             case "projects":
         return (
           <div className="relative w-full h-screen overflow-hidden">
             {/* Menu liste à gauche - repositionné plus au centre */}
             <SphereAlignedProjectList
               projects={projectList}
               selected={selected}
               onSelect={(idx) => {
                 setPrevSelected(selected);
                 setSelected(idx);
                 setSelectedImage(0);
               }}
               maxVisible={5}
             />

                           {/* Carrousel cylindrique 3D au centre */}
              <div className="absolute left-[56%] top-[45%] transform -translate-x-1/2 -translate-y-1/3 pointer-events-auto z-10">
               <div className="w-[900px] h-[550px] max-w-[75vw] max-h-[75vh]">
                 <CylinderCarousel
                   items={projectList}
                   selectedIndex={selected}
                   onItemChange={(index: number) => {
                     setPrevSelected(selected);
                     setSelected(index);
                     setSelectedImage(0);
                   }}
                 />
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

  // Plus de slide - supprimé

     return (
     <div className="relative w-full h-screen z-20 overflow-hidden pointer-events-auto">
       <div className="w-full h-full">
        

        {getPageContent()}
      </div>
    </div>
  )
}
