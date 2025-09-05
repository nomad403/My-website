"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SphereAlignedProjectList from "./SphereAlignedProjectList";
import CylinderCarousel from "./CylinderCarousel";
import ShuffleText from "./ShuffleText";

const stacks = [
  { title: "Frontend", items: ["React.js","Next.js","TypeScript","Tailwind CSS","Framer Motion","Three.js","React Three Fiber","Radix UI"] },
  { title: "Backend / API", items: ["Node.js","Express.js","Firebase","JSON API"] },
  { title: "Mobile", items: ["Kotlin","Jetpack Compose","Firebase","Swift","SwiftUI"] },
  { title: "IA & Automation", items: ["Azure OpenAI API","CrewAI","LangChain","Ollama","Power Automate"] },
  { title: "3D & Design", items: ["Three.js","React Three Fiber","GLSL","Figma","Photoshop","Illustrator","After Effects"] },
  { title: "DevOps / Déploiement", items: ["Vercel","GitHub"] },
];

interface ContentPagesProps {
  currentPage: string
  onBack: () => void
  isVisible?: boolean
}

const projectList = [
  {
    id: 1,
    name: "Monday",
    images: [
      "/images/monday.jpg"
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
      "/images/refrig_air_services.jpg"
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
      "/images/seine_saint_denis.png"
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
      "/images/portfolio.png"
    ],
    stack: ["React", "Three.js", "Canvas API", "Tailwind", "Framer Motion"],
    description: "Portfolio interactif et immersif, pensé comme une expérience technique et esthétique. Navigation 3D, effets HUD, storytelling visuel et démonstration de compétences avancées en frontend et design interactif.",
    context: "Projet personnel de branding, destiné à affirmer une identité forte et différenciante sur le marché des développeurs indépendants.",
    problem: "Se démarquer dans un univers saturé de portfolios génériques, tout en démontrant des compétences avancées en frontend et design interactif.",
    solution: "Conception d'une navigation en croix, menu 3D interactif, effets HUD et canvas, storytelling visuel immersif. L'ensemble du site est pensé comme une expérience, à la fois technique et esthétique.",
    impact: "Mémorisation immédiate, retours très positifs de la part de clients et recruteurs, preuve de polyvalence et d'innovation. Le portfolio a généré de nouvelles opportunités et renforcé la marque personnelle.",
  },
];

export default function ContentPages({ currentPage, onBack, isVisible = true }: ContentPagesProps) {
  const [selected, setSelected] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [prevSelected, setPrevSelected] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledTexts, setShuffledTexts] = useState<{[key: string]: string}>({});

  // Technology URL mapping
  const techUrls: {[key: string]: string} = {
    'React.js': 'https://react.dev',
    'Next.js': 'https://nextjs.org',
    'TypeScript': 'https://www.typescriptlang.org',
    'Tailwind CSS': 'https://tailwindcss.com',
    'Framer Motion': 'https://www.framer.com/motion',
    'Three.js': 'https://threejs.org',
    'React Three Fiber': 'https://docs.pmnd.rs/react-three-fiber',
    'Radix UI': 'https://www.radix-ui.com',
    'Node.js': 'https://nodejs.org',
    'Express.js': 'https://expressjs.com',
    'Firebase': 'https://firebase.google.com',
    'JSON API': 'https://jsonapi.org',
    'Kotlin': 'https://kotlinlang.org',
    'Jetpack Compose': 'https://developer.android.com/jetpack/compose',
    'Swift': 'https://swift.org',
    'SwiftUI': 'https://developer.apple.com/xcode/swiftui',
    'Azure OpenAI API': 'https://azure.microsoft.com/en-us/products/ai-services/openai-service',
    'CrewAI': 'https://www.crewai.com',
    'LangChain': 'https://langchain.com',
    'Ollama': 'https://ollama.ai',
    'Power Automate': 'https://powerautomate.microsoft.com',
    'GLSL': 'https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language',
    'Figma': 'https://www.figma.com',
    'Photoshop': 'https://www.adobe.com/products/photoshop.html',
    'Illustrator': 'https://www.adobe.com/products/illustrator.html',
    'After Effects': 'https://www.adobe.com/products/aftereffects.html',
    'Vercel': 'https://vercel.com',
    'GitHub': 'https://github.com'
  };

  // Handle technology clicks
  const handleTechClick = (techName: string) => {
    const url = techUrls[techName];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Contact form states
  const [currentContactStep, setCurrentContactStep] = useState(0);
  const [contactData, setContactData] = useState({
    nom: '',
    prenom: '',
    contact: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [titleText, setTitleText] = useState("Let's kick off a project.");
  const [shouldShuffleBack, setShouldShuffleBack] = useState(false);

  // Contact form steps configuration
  const contactSteps = [
    { field: 'nom' as const, label: 'YOUR NAME', type: 'text', placeholder: 'Enter your name' },
    { field: 'prenom' as const, label: 'YOUR FIRST NAME', type: 'text', placeholder: 'Enter your first name' },
    { field: 'contact' as const, label: 'EMAIL OR PHONE', type: 'text', placeholder: 'your@email.com or +1 234 567 8900' },
    { field: 'message' as const, label: 'YOUR MESSAGE', type: 'text', placeholder: 'Describe your project, needs, budget and timeline...' }
  ];

  // Handle contact form input changes
  const handleContactInputChange = (field: keyof typeof contactData, value: string) => {
    setContactData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle contact form navigation
  const handleContactNext = async () => {
    if (currentContactStep === 3) {
      // Last step: send email directly
      setIsSending(true);
      setSendStatus('idle');
      
      const payload = {
        nom: contactData.nom || "Test",
        prenom: contactData.prenom || "Alpha",
        contact: contactData.contact || "alpha@test.com",
        message: contactData.message || "Hello from dev",
      };

      try {
        const url = new URL("/api/contact", window.location.origin).toString();
        console.log("[contact] POST", url, payload);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log("[contact] status", res.status, text);

        if (!res.ok) {
          throw new Error(text || `HTTP ${res.status}`);
        }

        setTitleText("Message sent, I'll get back to you soon.");
        setSendStatus('success');
        
        // Reset form and title after 3 seconds
        setTimeout(() => {
          setContactData({ nom: '', prenom: '', contact: '', message: '' });
          setCurrentContactStep(0);
          setSendStatus('idle');
          setShouldShuffleBack(true);
          setTitleText("Let's kick off a project.");
        }, 3000);
        
      } catch (err: any) {
        console.error("[contact] FAILED", err?.message);
        alert("Erreur: " + (err?.message ?? "Failed to fetch"));
        setSendStatus('error');
      } finally {
        setIsSending(false);
      }
    } else {
      // Go to next step
      setCurrentContactStep(prev => prev + 1);
    }
  };

  // Create shuffle effect
  const shuffleText = (text: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    return text.split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  // Reset shuffle back flag after animation
  useEffect(() => {
    if (shouldShuffleBack) {
      const timer = setTimeout(() => {
        setShouldShuffleBack(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldShuffleBack]);

  // Effet pour gérer le shuffle lors de la disparition
  useEffect(() => {
    if (!isVisible && currentPage === "skills") {
      setIsShuffling(true);
      
      // Créer des versions shuffle de tous les textes
      const texts = [
        "Every project is an adventure.",
        "Expertise en frontend, mobile, IA et design 3D.",
        "Approche centrée sur l'expérience utilisateur et l'innovation technique.",
        "Frontend", "Backend / API", "Mobile", "IA & Automation", "3D & Design", "DevOps / Déploiement",
        "React.js", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Three.js", "React Three Fiber", "Radix UI",
        "Node.js", "Express.js", "Firebase", "JSON API",
        "Kotlin", "Jetpack Compose", "SwiftUI",
        "Azure OpenAI API", "CrewAI", "LangChain", "Ollama", "Power Automate",
        "GLSL", "Figma", "Photoshop", "Illustrator", "After Effects",
        "Vercel", "GitHub"
      ];
      
      const shuffled: {[key: string]: string} = {};
      texts.forEach(text => {
        shuffled[text] = shuffleText(text);
      });
      setShuffledTexts(shuffled);
      
      // Faire disparaître après le shuffle
      setTimeout(() => {
        setIsShuffling(false);
      }, 500);
    } else {
      setIsShuffling(false);
      setShuffledTexts({});
    }
  }, [isVisible, currentPage]);

  const getPageContent = () => {
    switch (currentPage) {
             

      case "skills":
        return (
          <div className="fixed inset-0 w-full h-full overflow-hidden bg-transparent">
            
            {/* Main content */}
            <div className="relative z-10 w-full h-full flex items-start">
              <div className="max-w-7xl mx-auto w-full pt-20 md:pt-40 px-4 md:px-0 h-full overflow-y-auto custom-scrollbar pb-20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Description Column */}
                    <div className="lg:col-span-5 lg:pr-8">
                      <div className="text-black">
                        <p className="font-jetbrains text-base md:text-lg lg:text-xl leading-relaxed opacity-90">
                          Every project is an adventure.
                          <br /><br />
                          The nomad spirit is about exploring, testing, and daring to embrace technologies that are ever more powerful and secure. In a digital world that is constantly evolving, meeting new needs requires continuous awareness and adaptation.
                          <br /><br />
                          As a web, mobile, and AI developer, I approach each project with care, turning challenges into opportunities for innovation.
                        </p>
                      </div>
                    </div>
                    
                    {/* Stacks Columns */}
                    <div className="lg:col-span-7 lg:pl-16">
                      {/* Mobile: Horizontal scroll layout */}
                      <div className="block sm:hidden">
                        <div className="flex flex-col space-y-8">
                          {/* Frontend */}
                          <div className="space-y-3">
                            <h3 className="font-kode text-lg text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts["Frontend"] || "Frontend" : "Frontend"}
                            </h3>
                            <div className="flex flex-wrap gap-2 font-jetbrains text-sm text-black/80 font-normal">
                              {['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Three.js', 'React Three Fiber', 'Radix UI'].map((tech) => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 rounded-full transition-all duration-300 hover:text-cyan-400 hover:bg-cyan-50 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Backend / API */}
                          <div className="space-y-3">
                            <h3 className="font-kode text-lg text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts["Backend / API"] || "Backend / API" : "Backend / API"}
                            </h3>
                            <div className="flex flex-wrap gap-2 font-jetbrains text-sm text-black/80 font-normal">
                              {['Node.js', 'Express.js', 'Firebase', 'JSON API'].map((tech) => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 rounded-full transition-all duration-300 hover:text-cyan-400 hover:bg-cyan-50 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Mobile */}
                          <div className="space-y-3">
                            <h3 className="font-kode text-lg text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts["Mobile"] || "Mobile" : "Mobile"}
                            </h3>
                            <div className="flex flex-wrap gap-2 font-jetbrains text-sm text-black/80 font-normal">
                              {['Kotlin', 'Jetpack Compose', 'Firebase', 'Swift', 'SwiftUI'].map((tech) => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 rounded-full transition-all duration-300 hover:text-cyan-400 hover:bg-cyan-50 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* IA & Automation */}
                          <div className="space-y-3">
                            <h3 className="font-kode text-lg text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts["IA & Automation"] || "IA & Automation" : "IA & Automation"}
                            </h3>
                            <div className="flex flex-wrap gap-2 font-jetbrains text-sm text-black/80 font-normal">
                              {['Azure OpenAI API', 'CrewAI', 'LangChain', 'Ollama', 'Power Automate'].map((tech) => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 rounded-full transition-all duration-300 hover:text-cyan-400 hover:bg-cyan-50 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 3D & Design */}
                          <div className="space-y-3">
                            <h3 className="font-kode text-lg text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts["3D & Design"] || "3D & Design" : "3D & Design"}
                            </h3>
                            <div className="flex flex-wrap gap-2 font-jetbrains text-sm text-black/80 font-normal">
                              {['Three.js', 'React Three Fiber', 'GLSL', 'Figma', 'Photoshop', 'Illustrator', 'After Effects'].map((tech) => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 rounded-full transition-all duration-300 hover:text-cyan-400 hover:bg-cyan-50 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* DevOps / Déploiement */}
                          <div className="space-y-3">
                            <h3 className="font-kode text-lg text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts["DevOps / Déploiement"] || "DevOps / Déploiement" : "DevOps / Déploiement"}
                            </h3>
                            <div className="flex flex-wrap gap-2 font-jetbrains text-sm text-black/80 font-normal">
                              {['Vercel', 'GitHub'].map((tech) => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 rounded-full transition-all duration-300 hover:text-cyan-400 hover:bg-cyan-50 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop: Responsive grid layout */}
                      <div className="hidden sm:grid w-full gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        
                        {/* Cartes responsives avec identité visuelle préservée */}
                        {stacks.map(({ title, items }) => (
                          <div key={title} className="space-y-3">
                            <h3 className="font-kode text-lg md:text-xl text-black tracking-wider uppercase font-medium">
                              {isShuffling ? shuffledTexts[title] || title : title}
                            </h3>
                            <div className="space-y-1 font-jetbrains text-sm md:text-base lg:text-lg text-black/80 font-normal">
                              {items.map(tech => (
                                <div 
                                  key={tech}
                                  className="cursor-pointer transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                  onClick={() => handleTechClick(tech)}
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          )
          
             case "projects":
         return (
           <div className="relative w-full h-screen overflow-hidden">
             {/* Desktop Layout */}
             <div className="hidden lg:block max-w-7xl mx-auto h-full">
               <div className="h-full flex items-center gap-16">
                 {/* List on the left */}
                 <div className="min-w-[180px]">
                   <SphereAlignedProjectList
                     projects={projectList}
                     selected={selected}
                     onSelect={(idx) => {
                       setPrevSelected(selected);
                       setSelected(idx);
                       setSelectedImage(0);
                     }}
                     maxVisible={5}
                     orientation="vertical"
                   />
                 </div>
                 {/* Carousel in center */}
                 <div className="flex-1 flex justify-center items-start">
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
             </div>

             {/* Tablet Layout */}
             <div className="hidden md:block lg:hidden w-full h-full flex flex-col">
               {/* Carousel centered at top */}
               <div className="flex-1 flex justify-center items-center p-6 pb-3">
                 <div className="w-full max-w-[85vw] h-[65vh]">
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
               
               {/* Horizontal menu at bottom */}
               <div className="h-[35vh] flex items-center justify-center p-6 pt-3">
                 <div className="w-full max-w-[85vw] flex justify-center">
                   <SphereAlignedProjectList
                     projects={projectList}
                     selected={selected}
                     onSelect={(idx) => {
                       setPrevSelected(selected);
                       setSelected(idx);
                       setSelectedImage(0);
                     }}
                     maxVisible={5}
                     orientation="horizontal"
                   />
                 </div>
               </div>
             </div>

             {/* Mobile Layout */}
             <div className="md:hidden w-full h-full flex flex-col">
               {/* Carousel centered at top */}
               <div className="flex-1 flex justify-center items-center p-4 pb-2">
                 <div className="w-full max-w-[95vw] h-[60vh]">
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
               
               {/* Horizontal menu at bottom */}
               <div className="h-[40vh] flex items-center justify-center p-4 pt-2">
                 <div className="w-full max-w-[95vw] flex justify-center">
                   <SphereAlignedProjectList
                     projects={projectList}
                     selected={selected}
                     onSelect={(idx) => {
                       setPrevSelected(selected);
                       setSelected(idx);
                       setSelectedImage(0);
                     }}
                     maxVisible={3}
                     orientation="horizontal"
                   />
                 </div>
               </div>
             </div>
           </div>
         )

                                                       case "contact":
           return (
             <div className="relative w-full h-screen flex flex-col">
               {/* Formulaire progressif centré */}
               <div className="flex-1 flex items-center justify-center px-4 md:px-8">
                 <div className="max-w-3xl mx-auto w-full">
                   {/* Main title */}
                   <div className="text-center mb-12 md:mb-20">
                     <div className="grid place-items-center">
                       {/* Ghost: reserves the max width. Invisible but still takes layout space */}
                       <span className="invisible whitespace-nowrap font-kode text-xl md:text-2xl lg:text-3xl uppercase tracking-wider">
                         Message sent, I'll get back to you soon.
                       </span>

                       {/* Real title on top, forced single line */}
                       <h1 className="col-start-1 row-start-1 whitespace-nowrap font-kode text-xl md:text-2xl lg:text-3xl text-gray-800 uppercase tracking-wider overflow-hidden text-ellipsis">
                         <ShuffleText triggerShuffle={sendStatus === 'success' || shouldShuffleBack} enableHover={false}>
                         {titleText}
                       </ShuffleText>
                     </h1>
                     </div>
                   </div>
                     
                   {/* Simplified form without gooey effect */}
                   <div className="flex items-center justify-center">
                     {/* BACK button (left) - fixed position with animation */}
                     <div className="w-16 flex justify-start">
                       <AnimatePresence mode="wait">
                         {currentContactStep > 0 && (
                           <motion.button
                             key="back-button"
                             initial={{ opacity: 0, scale: 0.8, x: -20 }}
                             animate={{ opacity: 1, scale: 1, x: 0 }}
                             exit={{ opacity: 0, scale: 0.8, x: -20 }}
                             transition={{ 
                               type: "spring", 
                               stiffness: 300, 
                               damping: 25,
                               duration: 0.3 
                             }}
                             onClick={() => setCurrentContactStep(prev => prev - 1)}
                             className="p-3 text-gray-600 hover:text-gray-800 transition-all duration-300 hover:scale-110"
                           >
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                               <line x1="5" y1="12" x2="19" y2="12"></line>
                               <polyline points="12,5 5,12 12,19"></polyline>
                             </svg>
                           </motion.button>
                         )}
                       </AnimatePresence>
                     </div>
                     
                     {/* Central field - responsive */}
                     <div className="flex-1 mx-2 max-w-[600px]">
                       {contactSteps[currentContactStep].field === 'message' ? (
                         <textarea
                           placeholder={contactSteps[currentContactStep].placeholder}
                           value={contactData[contactSteps[currentContactStep].field]}
                           onChange={(e) => handleContactInputChange(contactSteps[currentContactStep].field, e.target.value)}
                           className="w-full min-h-[48px] max-h-[200px] px-4 md:px-6 py-3 bg-white/90 backdrop-blur-sm border border-gray-300/50 rounded-xl text-gray-800 placeholder-gray-500 font-jetbrains text-sm md:text-base focus:border-cyan-400 focus:outline-none transition-all duration-300 shadow-lg resize-none overflow-y-auto custom-scrollbar"
                           rows={1}
                           style={{
                             height: 'auto',
                             minHeight: '48px',
                             maxHeight: '200px'
                           }}
                           onInput={(e) => {
                             const target = e.target as HTMLTextAreaElement;
                             target.style.height = 'auto';
                             const newHeight = Math.min(target.scrollHeight, 200);
                             target.style.height = newHeight + 'px';
                             
                             // Handle scrollbar display
                             if (newHeight >= 200) {
                               target.classList.add('scrollable');
                             } else {
                               target.classList.remove('scrollable');
                             }
                           }}
                         />
                       ) : (
                       <input
                         type={contactSteps[currentContactStep].type}
                         placeholder={contactSteps[currentContactStep].placeholder}
                         value={contactData[contactSteps[currentContactStep].field]}
                         onChange={(e) => handleContactInputChange(contactSteps[currentContactStep].field, e.target.value)}
                           className="w-full min-h-[48px] px-4 md:px-6 py-3 bg-white/90 backdrop-blur-sm border border-gray-300/50 rounded-xl text-gray-800 placeholder-gray-500 font-jetbrains text-sm md:text-base focus:border-cyan-400 focus:outline-none transition-all duration-300 shadow-lg"
                       />
                       )}
                     </div>
                     
                     {/* NEXT/SEND button (right) - fixed position with animation */}
                     <div className="w-16 flex justify-end">
                       <motion.button
                         key={`next-button-${currentContactStep}`}
                         initial={{ opacity: 0, scale: 0.8, x: 20 }}
                         animate={{ opacity: 1, scale: 1, x: 0 }}
                         transition={{ 
                           type: "spring", 
                           stiffness: 300, 
                           damping: 25,
                           duration: 0.3 
                         }}
                         onClick={() => handleContactNext()}
                         disabled={!contactData[contactSteps[currentContactStep].field]?.trim() || isSending}
                         className={`p-3 transition-all duration-300 hover:scale-110 ${
                           contactData[contactSteps[currentContactStep].field]?.trim() && !isSending
                             ? 'text-cyan-500 hover:text-cyan-600'
                             : 'text-gray-400 cursor-not-allowed'
                           }`}
                       >
                         {isSending ? (
                           <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                         ) : currentContactStep === 3 ? (
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M22 2L11 13"></path>
                             <polygon points="22,2 15,2 2,2 2,9 2,22 9,22 22,22 22,15"></polygon>
                           </svg>
                         ) : (
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <line x1="5" y1="12" x2="19" y2="12"></line>
                             <polyline points="12,5 19,12 12,19"></polyline>
                           </svg>
                         )}
                       </motion.button>
                     </div>
                   </div>
                   
                   {/* Error message - Fixed reserved space */}
                   <div className="mt-4 text-center min-h-[24px]">
                     <AnimatePresence mode="wait">
                   {sendStatus === 'error' && (
                     <motion.div 
                           key="error-message"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.3 }}
                     >
                       <p className="text-red-600 font-jetbrains text-sm">
                         ❌ Error sending message. Please try again.
                       </p>
                     </motion.div>
                   )}
                     </AnimatePresence>
                   </div>
                   
                   {/* Horizontal list of completed steps - Fixed reserved space */}
                   <div className="mt-6 md:mt-8 flex justify-center">
                     <div className="flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-12 min-h-[80px] md:min-h-[100px]">
                       {contactSteps.map((step, index) => {
                         const hasValue = contactData[step.field]?.trim();
                         const isCurrentStep = index === currentContactStep;
                         
                         // Only show items with content
                         if (!hasValue) return null;
                         
                         return (
                           <div
                             key={step.field}
                             onClick={() => setCurrentContactStep(index)}
                             className={`cursor-pointer transition-all duration-300 ${
                               isCurrentStep ? 'text-cyan-600' : 'text-gray-600 hover:text-gray-800'
                             }`}
                           >
                             <h4 className="font-kode text-xs text-current uppercase tracking-wider mb-1">
                               {step.label}
                             </h4>
                             <p className="font-jetbrains text-xs md:text-sm text-current leading-relaxed max-w-[150px] md:max-w-[200px] truncate">
                               {contactData[step.field]}
                             </p>
                           </div>
                         );
                       })}
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
    <div className="relative w-full h-screen z-20 overflow-hidden pointer-events-auto">
      {getPageContent()}
    </div>
  )
}
