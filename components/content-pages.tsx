"use client"

import { ArrowLeft } from "lucide-react"
import LiquidGlass from "./LiquidGlass";

interface ContentPagesProps {
  currentPage: string
  onBack: () => void
}

export default function ContentPages({ currentPage, onBack }: ContentPagesProps) {
  const getPageContent = () => {
    switch (currentPage) {
      case "about":
        return (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-12 gap-8 h-full">
              {/* Left side - Main content */}
              <div className="col-span-8">
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight mt-16 hud-text">ABOUT</h1>
                <div className="space-y-8">
                  <div className="p-8">
                    <p className="font-jetbrains text-lg font-light text-black mb-6 leading-relaxed hud-text">
                      Développeur passionné par les technologies modernes et l'innovation digitale.
                    </p>
                    <p className="font-jetbrains text-base font-light text-gray-700 mb-4 leading-relaxed hud-text">
                      Spécialisé dans le développement frontend, mobile et l'intégration d'intelligence artificielle, je
                      crée des expériences utilisateur exceptionnelles et des solutions techniques sur-mesure.
                    </p>
                    <p className="font-jetbrains text-base font-light text-gray-700 leading-relaxed hud-text">
                      Mon approche combine créativité technique et performance pour donner vie à vos projets les plus
                      ambitieux.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Stats/Info */}
              <div className="col-span-4 space-y-6">
                <div className="p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-3 hud-text">
                    EXPERIENCE
                  </h3>
                  <p className="font-jetbrains text-xs font-light text-gray-600 leading-relaxed hud-text">
                    5+ années dans le développement web et mobile avec une expertise en technologies modernes
                  </p>
                </div>
                <div className="p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-3 hud-text">
                    APPROACH
                  </h3>
                  <p className="font-jetbrains text-xs font-light text-gray-600 leading-relaxed hud-text">
                    Méthodologie agile, code propre et focus sur l'expérience utilisateur
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case "skills":
        return (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12">
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight mt-16 hud-text">SPECIALIST</h1>
              </div>

              {/* Main skills grid */}
              <div className="col-span-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-blue-600 mr-4 hud-text">{"</>"}</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide hud-text">
                        Frontend
                      </h3>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-sm font-light text-gray-700">
                      <li>• React / Next.js</li>
                      <li>• TypeScript / JavaScript</li>
                      <li>• Tailwind CSS</li>
                      <li>• Three.js / WebGL</li>
                      <li>• Animations & Interactions</li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-green-600 mr-4 hud-text">[#]</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide hud-text">Mobile</h3>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-sm font-light text-gray-700">
                      <li>• React Native</li>
                      <li>• Flutter</li>
                      <li>• Applications hybrides</li>
                      <li>• Intégration API</li>
                      <li>• Notifications push</li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-purple-600 mr-4 hud-text">[AI]</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide hud-text">
                        Intelligence Artificielle
                      </h3>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-sm font-light text-gray-700">
                      <li>• Intégration OpenAI GPT</li>
                      <li>• Vision par ordinateur</li>
                      <li>• Chatbots intelligents</li>
                      <li>• Outils d'automatisation</li>
                      <li>• Machine Learning</li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-yellow-600 mr-4 hud-text">{"{}"}</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide hud-text">Tools</h3>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-sm font-light text-gray-700">
                      <li>• Git / GitHub</li>
                      <li>• Docker & CI/CD</li>
                      <li>• Méthodes Agiles</li>
                      <li>• Tests automatisés</li>
                      <li>• Optimisation performance</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="col-span-4">
                <div className="p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4 hud-text">
                    EXPERTISE LEVEL
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs font-light hud-text">Frontend</span>
                        <span className="font-kode text-xs hud-text">95%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full" style={{ width: "95%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs font-light hud-text">Mobile</span>
                        <span className="font-kode text-xs hud-text">85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-green-600 h-1 rounded-full" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs font-light hud-text">AI Integration</span>
                        <span className="font-kode text-xs hud-text">80%</span>
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
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12">
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight mt-16 hud-text">PROJECTS</h1>
              </div>

              {/* Featured project */}
              <div className="col-span-12">
                <div className="p-8 mb-8">
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8">
                      <h2 className="font-jetbrains text-2xl font-medium text-black mb-4 uppercase tracking-wide hud-text">
                        Portfolio 3D Interactif
                      </h2>
                      <p className="font-jetbrains text-base font-light text-gray-700 mb-6 leading-relaxed hud-text">
                        Site web avec navigation 3D immersive, effets de particules et animations fluides pour une
                        expérience utilisateur unique. Intégration d'effets visuels avancés et d'interactions
                        intuitives.
                      </p>
                      <div className="font-jetbrains text-xs font-light text-gray-600 hud-text">
                        Technologies: React, Next.js, Three.js, TypeScript, Tailwind CSS
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
                  <h3 className="font-jetbrains text-lg font-medium text-black mb-3 uppercase tracking-wide hud-text">
                    App Mobile E-commerce
                  </h3>
                  <p className="font-jetbrains text-sm font-light text-gray-700 mb-4 leading-relaxed hud-text">
                    Application mobile complète avec système de paiement intégré et interface utilisateur optimisée.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="tech-tag green hud-text">React Native</span>
                    <span className="tech-tag green hud-text">Stripe</span>
                  </div>
                </div>
              </div>

              <div className="col-span-6">
                <div className="p-6 mb-6">
                  <h3 className="font-jetbrains text-lg font-medium text-black mb-3 uppercase tracking-wide hud-text">
                    Assistant IA Personnalisé
                  </h3>
                  <p className="font-jetbrains text-sm font-light text-gray-700 mb-4 leading-relaxed hud-text">
                    Chatbot intelligent avec analyse de documents et automatisation de tâches complexes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="tech-tag purple hud-text">OpenAI</span>
                    <span className="tech-tag purple hud-text">Python</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "contact":
        return (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight mt-16 hud-text">CONTACT</h1>
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4 hud-text">
                        GET IN TOUCH
                      </h3>
                      <div className="space-y-3 font-jetbrains text-sm font-light">
                        <div>
                          <span className="text-blue-600 uppercase tracking-wide hud-text">Email</span>
                          <p className="text-gray-700 hud-text">contact@nomad403.dev</p>
                        </div>
                        <div>
                          <span className="text-blue-600 uppercase tracking-wide hud-text">Phone</span>
                          <p className="text-gray-700 hud-text">+33 (0)1 23 45 67 89</p>
                        </div>
                        <div>
                          <span className="text-blue-600 uppercase tracking-wide hud-text">Location</span>
                          <p className="text-gray-700 hud-text">France, Remote Available</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4 hud-text">
                        SOCIAL LINKS
                      </h3>
                      <div className="space-y-3 font-jetbrains text-sm font-light">
                        <div>
                          <span className="text-green-600 uppercase tracking-wide hud-text">LinkedIn</span>
                          <p className="text-gray-700 hud-text">/in/nomad403</p>
                        </div>
                        <div>
                          <span className="text-green-600 uppercase tracking-wide hud-text">GitHub</span>
                          <p className="text-gray-700 hud-text">/nomad403</p>
                        </div>
                        <div>
                          <span className="text-green-600 uppercase tracking-wide hud-text">Twitter</span>
                          <p className="text-gray-700 hud-text">@nomad403</p>
                        </div>
                      </div>
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
    <div className="absolute inset-0 z-25 bg-white/30 backdrop-blur-sm overflow-y-auto">
      <div className="container mx-auto px-8 py-8 min-h-full">
        

        {getPageContent()}
      </div>
    </div>
  )
}
