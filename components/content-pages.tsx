"use client"

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ShuffleText from "./ShuffleText";
import ProjectsScrollList, {
  type ProjectScrollItem,
} from "./ProjectsScrollList";
import ProjectDetailPanel from "./ProjectDetailPanel";
import SpecialistCatalog from "./SpecialistCatalog";
import { useLanguage } from "@/app/contexts/LanguageContext";
import {
  PROJECT_ITEMS,
  projectCopy,
  type ProjectItem,
  type ProjectLang,
} from "@/lib/project-items";

interface ContentPagesProps {
  currentPage: string
  onBack: () => void
  isVisible?: boolean
}

function toScrollItem(item: ProjectItem, lang: ProjectLang): ProjectScrollItem {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    description: projectCopy(item.description, lang),
    summary: projectCopy(item.summary, lang) || undefined,
    stack: item.stack,
  }
}

export default function ContentPages({ currentPage, onBack, isVisible = true }: ContentPagesProps) {
  // Language context
  const { t, language } = useLanguage();
  const projectLang = (language === "en" ? "en" : "fr") as ProjectLang
  const scrollItems = useMemo(
    () => PROJECT_ITEMS.map((item) => toScrollItem(item, projectLang)),
    [projectLang],
  )
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(
    () => PROJECT_ITEMS[0] ?? null,
  )
  const handleActiveChange = useCallback((item: ProjectScrollItem) => {
    const full = PROJECT_ITEMS.find((entry) => entry.id === item.id) ?? null
    setActiveProject(full)
  }, [])
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

  // Reset shuffle back flag after animation
  useEffect(() => {
    if (shouldShuffleBack) {
      const timer = setTimeout(() => {
        setShouldShuffleBack(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldShuffleBack]);

  const getPageContent = () => {
    switch (currentPage) {
             

      case "specialist":
        return (
          <div className="relative w-full h-full overflow-hidden bg-transparent">
            <SpecialistCatalog lang={language} />

            <div className="sr-only">
              <p>
                Catalogue d&apos;offres Nomad403 : développement web, applications mobiles,
                automatisation, intelligence artificielle et conseil technique pour startups,
                studios créatifs et entreprises.
              </p>
              <p>
                Univers WEB : site vitrine, page d&apos;atterrissage, e-commerce, application web,
                outil métier, tableau de bord, refonte, reprise de projet, intégration API,
                maintenance et évolution.
              </p>
              <p>
                Univers MOBILE : applications iOS et Android, application métier, MVP, prototype,
                refonte, reprise, intégration API, fonctionnalités natives, publication, maintenance
                et évolution.
              </p>
              <p>
                Univers AUTOMATISATION : audit de processus, automatisation métier, e-mails, documents,
                extraction de données, synchronisation d&apos;outils, orchestration API, supervision,
                maintenance et évolution.
              </p>
              <p>
                Univers IA : cadrage, intégration, assistant métier, analyse, classification,
                extraction, RAG, génération, synthèse, prototype, reprise, optimisation et maintenance.
              </p>
              <p>
                Univers CONSEIL : audit technique, architecture, cadrage, choix technologique,
                souveraineté numérique, maîtrise des données, confidentialité dès la conception,
                accompagnement RGPD technique, documentation et étude de faisabilité.
              </p>
            </div>
          </div>
        )
          
            case "projects":
        return (
          <div className="absolute inset-0 h-full w-full overflow-x-clip overflow-y-hidden">
            {/* H1 pour le SEO - invisible mais accessible */}
            <h1 className="sr-only">Projects — Nomad403 (Nomad 403)</h1>

            <ProjectsScrollList
              items={scrollItems}
              onActiveChange={handleActiveChange}
            />
            <ProjectDetailPanel
              item={activeProject}
              lang={projectLang}
              viewLabel={t("projects.view")}
            />
             
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
                 Savage Block Party (site vitrine e-commerce), The Message (wearethemessage.fr), 
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

                                                       case "contact":
           return (
             <div className="relative w-full h-full flex items-center justify-center px-4 pt-16 pb-28 md:px-8 md:pt-24 md:pb-32 box-border">
               {/* H1 pour le SEO - invisible mais accessible */}
               <h1 className="sr-only">Contact — Nomad403 (Nomad 403)</h1>
               
               {/* Formulaire progressif centré */}
               <div className="w-full max-w-3xl mx-auto">
                 <div className="w-full max-w-[90vw] sm:max-w-[600px] mx-auto flex flex-col gap-4">
                   {/* Titre — même largeur que le champ */}
                   <div className="w-full mb-2 md:mb-6">
                     <h1 className="w-full font-kode text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-800 uppercase tracking-wider text-left">
                       <ShuffleText triggerShuffle={sendStatus === 'success' || shouldShuffleBack}>
                         {titleText}
                       </ShuffleText>
                     </h1>
                   </div>

                   {/* Champ de saisie */}
                   <div className="w-full">
                       {contactSteps[currentContactStep].field === 'message' ? (
                         <textarea
                           placeholder={contactSteps[currentContactStep].placeholder}
                           value={contactData[contactSteps[currentContactStep].field]}
                           onChange={(e) => handleContactInputChange(contactSteps[currentContactStep].field, e.target.value)}
                           className="w-full min-h-[48px] max-h-[200px] px-4 md:px-6 py-3 bg-white/90 backdrop-blur-sm border border-gray-300/50 rounded-xl text-gray-800 placeholder-gray-500 font-kode text-sm md:text-base focus:border-cyan-400 focus:outline-none transition-all duration-300 shadow-lg resize-none overflow-y-auto custom-scrollbar"
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
                           className="w-full min-h-[48px] px-4 md:px-6 py-3 bg-white/90 backdrop-blur-sm border border-gray-300/50 rounded-xl text-gray-800 placeholder-gray-500 font-kode text-sm md:text-base focus:border-cyan-400 focus:outline-none transition-all duration-300 shadow-lg"
                       />
                       )}
                   </div>

                   {/* Navigation — sous le champ, gauche / droite */}
                   <div className="flex w-full justify-between items-center gap-4 min-h-[48px]">
                      <div className="flex justify-start">
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
                              className="px-4 py-3 rounded-xl border border-gray-300/50 text-gray-600 hover:text-gray-800 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                              </svg>
                              <span className="font-kode text-sm uppercase tracking-wide">Retour</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex justify-end">
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
                          className={`px-4 py-3 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                            contactData[contactSteps[currentContactStep].field]?.trim() && !isSending
                              ? 'border-cyan-400 text-cyan-500 hover:text-cyan-600 hover:scale-105'
                              : 'border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="font-kode text-sm uppercase tracking-wide">
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

                   {/* Message d'erreur */}
                   <div className="text-center min-h-[24px]">
                     <AnimatePresence mode="wait">
                       {sendStatus === 'error' && (
                         <motion.div
                           key="error-message"
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.3 }}
                         >
                           <p className="text-red-600 font-kode text-sm">
                             {t('contact.error')}
                           </p>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {/* Témoins de saisie — largeur fixe, grille 2 colonnes */}
                   <div
                     className={`mt-2 md:mt-4 grid grid-cols-1 sm:grid-cols-[repeat(2,288px)] gap-4 justify-start${
                       contactSteps.some((step) => contactData[step.field]?.trim()) ? ' min-h-[80px] md:min-h-[100px]' : ''
                     }`}
                   >
                     {contactSteps.map((step, index) => {
                       const hasValue = contactData[step.field]?.trim();
                       const isCurrentStep = index === currentContactStep;

                       if (!hasValue) return null;

                       return (
                         <div
                           key={step.field}
                           onClick={() => setCurrentContactStep(index)}
                           className={`w-full sm:w-[288px] sm:max-w-[288px] min-h-[72px] cursor-pointer transition-all duration-300 px-4 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-sm box-border ${
                             isCurrentStep ? 'text-cyan-600' : 'text-gray-600 hover:text-gray-800'
                           }`}
                         >
                           <h4 className="font-kode text-xs text-current uppercase tracking-wider mb-1 truncate">
                             {step.label}
                           </h4>
                           <p className="font-home-title text-xs md:text-sm text-current leading-relaxed line-clamp-2">
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
