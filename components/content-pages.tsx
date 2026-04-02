"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ShuffleText from "./ShuffleText";
import DecisionLayer from "./DecisionLayer";
import ProjectsCarousel from "./ProjectsCarousel";
import { useLanguage } from "@/app/contexts/LanguageContext";

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

export default function ContentPages({ currentPage, onBack, isVisible = true }: ContentPagesProps) {
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledTexts, setShuffledTexts] = useState<{[key: string]: string}>({});
  
  // Language context
  const { t } = useLanguage();

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
  const [titleText, setTitleText] = useState(t('contact.title'));
  
  // Mettre à jour le titre quand la langue change
  useEffect(() => {
    setTitleText(t('contact.title'));
  }, [t]);
  const [shouldShuffleBack, setShouldShuffleBack] = useState(false);

  // Contact form steps configuration - recalculé à chaque changement de langue
  const contactSteps = [
    { field: 'nom' as const, label: t('contact.fields.name'), type: 'text', placeholder: t('contact.placeholders.name') },
    { field: 'prenom' as const, label: t('contact.fields.firstname'), type: 'text', placeholder: t('contact.placeholders.firstname') },
    { field: 'contact' as const, label: t('contact.fields.contact'), type: 'text', placeholder: t('contact.placeholders.contact') },
    { field: 'message' as const, label: t('contact.fields.message'), type: 'text', placeholder: t('contact.placeholders.message') }
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

        setTitleText(t('contact.success'));
        setSendStatus('success');
        
        // Reset form and title after 3 seconds
        setTimeout(() => {
          setContactData({ nom: '', prenom: '', contact: '', message: '' });
          setCurrentContactStep(0);
          setSendStatus('idle');
          setShouldShuffleBack(true);
          setTitleText(t('contact.title'));
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
    if (!isVisible && currentPage === "specialist") {
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
             

      case "specialist":
        return (
          <div className="relative w-full h-full overflow-hidden bg-transparent">
            {/* H1 pour le SEO - invisible mais accessible */}
            <h1 className="sr-only">Skills & Expertise — Nomad403 (Nomad 403)</h1>
            
            {/* Main content */}
            <div className="relative z-10 w-full h-full flex items-start">
              <div className="max-w-7xl mx-auto w-full pt-20 md:pt-40 px-4 sm:px-6 md:px-8 lg:px-12 h-full overflow-y-auto custom-scrollbar pb-20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Description Column */}
                    <div className="lg:col-span-5 lg:pr-8">
                      <div className="text-black">
                        <p className="font-jetbrains text-base md:text-lg lg:text-xl leading-relaxed opacity-90">
                          {t('specialist.intro')}
                          <br /><br />
                          {t('specialist.text1')}
                          <br /><br />
                          {t('specialist.text2')}
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
              
              {/* Contenu SEO invisible pour la page specialist */}
              <div className="sr-only">
                <p>
                  Expertise technique de Nomad403, Nomad 403, nomad-403, développeur freelance spécialisé 
                  dans le développement web, mobile et intégration IA basé à Paris. Compétences 
                  avancées en technologies modernes pour startups, studios créatifs, marques de luxe 
                  et entreprises tech. Approche centrée sur l'innovation, la performance et l'expérience utilisateur.
                </p>
                <p>
                  Technologies maîtrisées : Frontend (React.js, Next.js, TypeScript, Tailwind CSS, 
                  Framer Motion, Three.js, React Three Fiber, Radix UI), Backend (Node.js, Express.js, 
                  Firebase, JSON API), Mobile (Kotlin, Jetpack Compose, Swift, SwiftUI), 
                  IA & Automation (Azure OpenAI API, CrewAI, LangChain, Ollama, Power Automate).
                </p>
                <p>
                  Spécialisations : développement d'applications web performantes et scalables, 
                  création d'applications mobiles natives iOS et Android, intégration d'intelligence 
                  artificielle et de machine learning, automatisation de processus métier, 
                  développement d'interfaces utilisateur modernes et interactives.
                </p>
                <p>
                  Services proposés : consulting technique, architecture de solutions, développement 
                  full-stack, MVP et prototypage rapide, refactoring et optimisation, maintenance 
                  et évolution. Partenaire de confiance pour les projets ambitieux nécessitant 
                  expertise technique et vision créative dans l'écosystème tech parisien.
                </p>
                <p>
                  Recherches associées : nomad403 skills, nomad 403 expertise, nomad-403 technologies, 
                  nomad403 react developer, nomad 403 kotlin, nomad-403 swift, nomad403 typescript, 
                  nomad 403 nextjs, nomad-403 mobile developer, nomad403 ai integration, 
                  nomad 403 freelance skills, nomad-403 paris developer.
                </p>
              </div>
            </div>
          )
          
            case "projects":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* H1 pour le SEO - invisible mais accessible */}
            <h1 className="sr-only">Projects — Nomad403 (Nomad 403)</h1>
            
            {/* Carrousel horizontal centré verticalement */}
            <div className="w-full h-[clamp(400px,60vh,600px)] px-4 md:px-8 overflow-visible">
              <ProjectsCarousel
                items={[
                  { id: 1, name: "Monday", image: "/images/monday.webp", description: "Application android, IA" },
                  { id: 2, name: "TurnUpSphere", image: "/images/turnupsphere.webp", description: "Application Android" },
                  { id: 3, name: "ras-energies.com", image: "/images/refrig_air_services.webp", url: "https://paris.ras-energies.com", description: "Site web vitrine" },
                  { id: 4, name: "AutomatIA", image: "/images/seine_saint_denis.webp", description: "Automatisation, IA, Identification de processus, RGPD" },
                  { id: 5, name: "Nomad403", image: "/images/portfolio.webp", description: "Site web intéractif" },
                  { id: 6, name: "Savage Block Party", image: "/images/savage_block_party.webp", url: "https://savage-block-party.vercel.app", description: "Site web vitrine, E-commerce" },
                ]}
              />
            </div>
             
             {/* Contenu SEO invisible pour la page projects */}
             <div className="sr-only">
               <p>
                 Portfolio de projets développés par Nomad403, Nomad 403, nomad-403, développeur freelance 
                 spécialisé dans les solutions digitales pour startups, studios créatifs et entreprises tech. 
                 Découvrez des réalisations innovantes : applications mobiles natives, plateformes web 
                 performantes, intégrations d'intelligence artificielle, et solutions d'automatisation.
               </p>
               <p>
                 Projets phares : Monday (application mobile de planification adaptative avec IA), 
                 TurnUpSphere (plateforme événementielle géolocalisée), AutomatIA (solution d'automatisation 
                 IA pour le secteur public), Refrig'Air Services (vitrine professionnelle responsive), 
                 et ce portfolio génératif interactif. Chaque projet démontre l'expertise technique 
                 et la créativité dans le développement d'expériences utilisateur exceptionnelles.
               </p>
               <p>
                 Technologies utilisées : Next.js, React, TypeScript, Tailwind CSS, Kotlin, 
                 Jetpack Compose, Swift, SwiftUI, Azure OpenAI, Power Automate, Three.js, 
                 React Three Fiber. Approche méthodologique : conception UX/UI, architecture 
                 scalable, développement agile, tests automatisés, déploiement continu.
               </p>
               <p>
                 Services proposés : développement d'applications web et mobiles sur mesure, 
                 intégration d'intelligence artificielle, consulting technique, MVP et prototypage, 
                 refactoring et optimisation, maintenance et évolution. Partenaire de confiance 
                 pour les projets ambitieux nécessitant expertise technique et vision créative.
               </p>
               <p>
                 Recherches associées : nomad403 portfolio, nomad 403 projets, nomad-403 github, 
                 nomad403 mobile app, nomad 403 web development, nomad-403 react projects, 
                 nomad403 kotlin, nomad 403 swift, nomad-403 typescript, nomad403 nextjs, 
                 nomad 403 ai projects, nomad-403 freelance work.
               </p>
             </div>
           </div>
         )

                                                       case "decision":
           return (
             <div className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-transparent lg:overflow-hidden">
               {/* H1 pour le SEO - invisible mais accessible */}
               <h1 className="sr-only">Couche de décision — Nomad403 (Nomad 403)</h1>
               
              <div className="relative z-10 w-full h-full pointer-events-auto">
                <DecisionLayer />
              </div>
             </div>
           )

                                                       case "contact":
           return (
             <div className="relative w-full h-full flex items-center justify-center">
               {/* H1 pour le SEO - invisible mais accessible */}
               <h1 className="sr-only">Contact — Nomad403 (Nomad 403)</h1>
               
               {/* Formulaire progressif centré */}
               <div className="w-full max-w-3xl mx-auto px-4 md:px-8">
                 {/* Main title */}
                 <div className="text-center mb-8 md:mb-12 px-4">
                     <div className="flex justify-center items-center">
                       <h1 className="font-kode text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-800 uppercase tracking-wider text-center max-w-full">
                         <ShuffleText triggerShuffle={sendStatus === 'success' || shouldShuffleBack} enableHover={false}>
                           {titleText}
                         </ShuffleText>
                       </h1>
                     </div>
                 </div>
                     
                 {/* Simplified form without gooey effect */}
                 <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
                   {/* Central field - responsive */}
                   <div className="flex-1 mx-2 w-full max-w-[90vw] sm:max-w-[600px]">
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
                     
                   {/* Navigation buttons (stacked on mobile, inline on desktop) */}
                   <div className="flex w-full max-w-[90vw] sm:max-w-[600px] justify-between gap-4 md:w-auto md:max-w-none">
                      <div className="flex-1 flex justify-start">
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
                              className="w-full md:w-auto px-4 py-3 rounded-xl border border-gray-300/50 text-gray-600 hover:text-gray-800 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                              </svg>
                              <span className="font-jetbrains text-sm uppercase tracking-wide">Retour</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex-1 flex justify-end">
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
                          className={`w-full md:w-auto px-4 py-3 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                            contactData[contactSteps[currentContactStep].field]?.trim() && !isSending
                              ? 'border-cyan-400 text-cyan-500 hover:text-cyan-600 hover:scale-105'
                              : 'border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="font-jetbrains text-sm uppercase tracking-wide">
                            {currentContactStep === 3 ? 'Envoyer' : 'Suivant'}
                          </span>
                          {isSending ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {currentContactStep === 3 ? (
                                <>
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </>
                              ) : (
                                <polyline points="9 18 15 12 9 6"></polyline>
                              )}
                            </svg>
                          )}
                        </motion.button>
                     </div>
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
                         {t('contact.error')}
                       </p>
                     </motion.div>
                   )}
                     </AnimatePresence>
                 </div>
                   
                 {/* Completed steps (responsive layout) */}
                 <div className="mt-6 md:mt-8 flex justify-center">
                    <div className="flex flex-col gap-4 w-full max-w-md md:max-w-none md:flex-row md:flex-wrap md:justify-center md:gap-6 lg:gap-12 min-h-[80px] md:min-h-[100px]">
                       {contactSteps.map((step, index) => {
                         const hasValue = contactData[step.field]?.trim();
                         const isCurrentStep = index === currentContactStep;
                         
                         // Only show items with content
                         if (!hasValue) return null;
                         
                         return (
                          <div
                             key={step.field}
                             onClick={() => setCurrentContactStep(index)}
                            className={`cursor-pointer transition-all duration-300 px-4 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-sm ${
                               isCurrentStep ? 'text-cyan-600' : 'text-gray-600 hover:text-gray-800'
                             }`}
                           >
                            <h4 className="font-kode text-xs text-current uppercase tracking-wider mb-1">
                               {step.label}
                             </h4>
                            <p className="font-jetbrains text-xs md:text-sm text-current leading-relaxed line-clamp-2 md:line-clamp-3">
                               {contactData[step.field]}
                             </p>
                           </div>
                         );
                       })}
                     </div>
                 </div>
                 
                 {/* Contenu SEO invisible pour la page contact */}
                 <div className="sr-only">
                 <p>
                   Contactez Nomad403, Nomad 403, nomad-403, développeur freelance spécialisé dans le développement 
                   web, mobile et intégration IA basé à Paris. Partenaire de confiance pour startups, 
                   studios créatifs, marques de luxe et entreprises tech. Expertise en React, Next.js, 
                   TypeScript, Kotlin, Swift, et intégration d'intelligence artificielle.
                 </p>
                 <p>
                   Services proposés : développement d'applications web et mobiles sur mesure, 
                   intégration d'intelligence artificielle, consulting technique, architecture de solutions, 
                   MVP et prototypage rapide, refactoring et optimisation, maintenance et évolution. 
                   Approche centrée sur l'expérience utilisateur, la performance et la scalabilité.
                 </p>
                 <p>
                   Technologies maîtrisées : Next.js, React, TypeScript, Tailwind CSS, Kotlin, 
                   Jetpack Compose, Swift, SwiftUI, Azure OpenAI, Power Automate, Three.js, 
                   React Three Fiber. Méthodologie : conception UX/UI, architecture scalable, 
                   développement agile, tests automatisés, déploiement continu.
                 </p>
                 <p>
                   Portfolio créatif et technique démontrant l'excellence dans le développement 
                   d'interfaces utilisateur modernes, d'expériences interactives 3D, et de solutions 
                   d'automatisation intelligente. Partenaire de confiance pour les projets ambitieux 
                   nécessitant expertise technique et vision créative dans l'écosystème tech parisien.
                 </p>
                 <p>
                   Recherches associées : nomad403 contact, nomad 403 freelance, nomad-403 hire, 
                   nomad403 developer paris, nomad 403 web developer, nomad-403 mobile developer, 
                   nomad403 react developer, nomad 403 kotlin, nomad-403 swift, nomad403 typescript, 
                   nomad 403 nextjs, nomad-403 ai developer, nomad403 portfolio contact.
                 </p>
                 </div>
               </div>
             </div>
           )

      default:
        return null
    }
  }


     return (
    <div className="relative w-full h-full z-20 overflow-hidden pointer-events-auto">
      {getPageContent()}
      
      {/* SEO Internal Links - Invisible but accessible to crawlers */}
      <div className="sr-only">
        <nav aria-label="Navigation contextuelle SEO">
          <ul>
            <li><a href="https://www.nomad403.com/">Retour à l'accueil</a></li>
            {currentPage === 'projects' && (
              <>
                <li><a href="https://www.nomad403.com/specialist">Voir mes compétences techniques développeur freelance Paris</a></li>
                <li><a href="https://www.nomad403.com/contact">Me contacter pour un projet React Next.js Kotlin Swift</a></li>
              </>
            )}
            {currentPage === 'specialist' && (
              <>
                <li><a href="https://www.nomad403.com/projects">Voir mes réalisations développement web mobile</a></li>
                <li><a href="https://www.nomad403.com/contact">Discuter de vos besoins techniques développeur freelance</a></li>
              </>
            )}
            {currentPage === 'contact' && (
              <>
                <li><a href="https://www.nomad403.com/projects">Découvrir mes projets React Next.js Kotlin Swift</a></li>
                <li><a href="https://www.nomad403.com/specialist">Consulter mes compétences développeur web mobile</a></li>
              </>
            )}
          </ul>
        </nav>
        
        {/* Liens contextuels par mots-clés */}
        <div>
          <h3>Liens contextuels</h3>
          <ul>
            <li><a href="https://www.nomad403.com/projects">Portfolio développeur React Next.js freelance Paris</a></li>
            <li><a href="https://www.nomad403.com/specialist">Expertise Kotlin Swift mobile iOS Android</a></li>
            <li><a href="https://www.nomad403.com/contact">Développeur freelance Paris web mobile</a></li>
            <li><a href="https://www.nomad403.com/projects">Applications web sur mesure React Next.js</a></li>
            <li><a href="https://www.nomad403.com/specialist">Intégration IA Azure OpenAI développeur expert</a></li>
            <li><a href="https://www.nomad403.com/contact">Devis gratuit développeur web mobile freelance</a></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
