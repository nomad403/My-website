"use client"

import { ArrowLeft } from "lucide-react"
import LiquidGlass from "./LiquidGlass";
import HudText from "./hud-text";

interface ContentPagesProps {
  currentPage: string
  onBack: () => void
}

export default function ContentPages({ currentPage, onBack }: ContentPagesProps) {
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

              {/* Main skills grid */}
              <div className="col-span-8">
                <div className="grid grid-cols-2 gap-12">
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-blue-600 mr-4 hud-text">{"</>"}</div>
                      <HudText duration={0.8}>Frontend</HudText>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed list-disc pl-6 mb-4">
                      <li>React / Next.js</li>
                      <li>TypeScript / JavaScript</li>
                      <li>Tailwind CSS</li>
                      <li>Three.js / WebGL</li>
                      <li>Animations & Interactions</li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-green-600 mr-4 hud-text">[#]</div>
                      <HudText duration={0.8}>Mobile</HudText>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed list-disc pl-6 mb-4">
                      <li>React Native</li>
                      <li>Flutter</li>
                      <li>Applications hybrides</li>
                      <li>Intégration API</li>
                      <li>Notifications push</li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-purple-600 mr-4 hud-text">[AI]</div>
                      <HudText duration={0.8}>Intelligence Artificielle</HudText>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed list-disc pl-6 mb-4">
                      <li>Intégration OpenAI GPT</li>
                      <li>Vision par ordinateur</li>
                      <li>Chatbots intelligents</li>
                      <li>Outils d'automatisation</li>
                      <li>Machine Learning</li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-yellow-600 mr-4 hud-text">{"{}"}</div>
                      <HudText duration={0.8}>Tools</HudText>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed list-disc pl-6 mb-4">
                      <li>Git / GitHub</li>
                      <li>Docker & CI/CD</li>
                      <li>Méthodes Agiles</li>
                      <li>Tests automatisés</li>
                      <li>Optimisation performance</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="col-span-4">
                <div className="p-6">
                  <HudText scanlines={true} duration={1.2}>EXPERTISE LEVEL</HudText>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs text-[#111] uppercase tracking-wide">Frontend</span>
                        <span className="font-kode text-xs text-[#111]">95%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full" style={{ width: "95%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs text-[#111] uppercase tracking-wide">Mobile</span>
                        <span className="font-kode text-xs text-[#111]">85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-green-600 h-1 rounded-full" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs text-[#111] uppercase tracking-wide">AI Integration</span>
                        <span className="font-kode text-xs text-[#111]">80%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-purple-600 h-1 rounded-full" style={{ width: "80%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "projects":
        return (
          <div className="max-w-5xl mx-auto mt-32 px-4">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12">
                <HudText scanlines={true} duration={1.2}>PROJECTS</HudText>
              </div>

              {/* Featured project */}
              <div className="col-span-12">
                <div className="p-8 mb-8">
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8">
                      <HudText duration={0.8} className="mb-6">Portfolio 3D Interactif</HudText>
                      <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                        <p>Site web avec navigation 3D immersive, effets de particules et animations fluides pour une expérience utilisateur unique. Intégration d'effets visuels avancés et d'interactions intuitives.</p>
                        <p>Technologies: React, Next.js, Three.js, TypeScript, Tailwind CSS</p>
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-wrap gap-2 items-start">
                      <span className="tech-tag blue hud-text">React</span>
                      <span className="tech-tag blue hud-text">Three.js</span>
                      <span className="tech-tag blue hud-text">WebGL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other projects */}
              <div className="col-span-6">
                <div className="p-6 mb-6">
                  <HudText duration={0.8} className="mb-6">App Mobile E-commerce</HudText>
                  <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                    <p>Application mobile complète avec système de paiement intégré et interface utilisateur optimisée.</p>
                    <p>Technologies: React Native, Stripe</p>
                  </div>
                </div>
              </div>

              <div className="col-span-6">
                <div className="p-6 mb-6">
                  <HudText duration={0.8} className="mb-6">Assistant IA Personnalisé</HudText>
                  <div className="space-y-2 font-jetbrains text-base text-[#111] leading-relaxed mb-4">
                    <p>Chatbot intelligent avec analyse de documents et automatisation de tâches complexes.</p>
                    <p>Technologies: OpenAI, Python</p>
                  </div>
                </div>
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
                <HudText scanlines={true} duration={1.2}>CONTACT</HudText>
                <div className="p-8">
                  <HudText duration={0.8}>GET IN TOUCH</HudText>
                  <div className="space-y-3 font-jetbrains text-sm font-light mt-8">
                    <div>
                      <span className="text-blue-600 uppercase tracking-wide hud-text">Email</span>
                      <HudText>contact@nomad403.dev</HudText>
                    </div>
                    <div>
                      <span className="text-blue-600 uppercase tracking-wide hud-text">Phone</span>
                      <HudText>+33 (0)1 23 45 67 89</HudText>
                    </div>
                    <div>
                      <span className="text-blue-600 uppercase tracking-wide hud-text">Location</span>
                      <HudText>France, Remote Available</HudText>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right side - Social links */}
              <div className="col-span-4 space-y-6">
                <div className="p-8">
                  <HudText scanlines={true} duration={1.2}>SOCIAL LINKS</HudText>
                  <div className="space-y-3 font-jetbrains text-sm font-light mt-8">
                    <div>
                      <span className="text-green-600 uppercase tracking-wide hud-text">LinkedIn</span>
                      <HudText>/in/nomad403</HudText>
                    </div>
                    <div>
                      <span className="text-green-600 uppercase tracking-wide hud-text">GitHub</span>
                      <HudText>/nomad403</HudText>
                    </div>
                    <div>
                      <span className="text-green-600 uppercase tracking-wide hud-text">Twitter</span>
                      <HudText>@nomad403</HudText>
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
    <div className="relative w-full min-h-screen z-25 bg-white/30 backdrop-blur-sm overflow-y-auto">
      <div className="container mx-auto px-8 py-8 min-h-full">
        

        {getPageContent()}
      </div>
    </div>
  )
}
