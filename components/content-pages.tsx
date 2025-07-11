"use client"

import { ArrowLeft } from "lucide-react"

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
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight">ABOUT</h1>
                <div className="space-y-8">
                  <div className="liquid-card p-8">
                    <p className="font-jetbrains text-lg font-light text-black mb-6 leading-relaxed">
                      Développeur passionné par les technologies modernes et l'innovation digitale.
                    </p>
                    <p className="font-jetbrains text-base font-light text-gray-700 mb-4 leading-relaxed">
                      Spécialisé dans le développement frontend, mobile et l'intégration d'intelligence artificielle, je
                      crée des expériences utilisateur exceptionnelles et des solutions techniques sur-mesure.
                    </p>
                    <p className="font-jetbrains text-base font-light text-gray-700 leading-relaxed">
                      Mon approche combine créativité technique et performance pour donner vie à vos projets les plus
                      ambitieux.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Stats/Info */}
              <div className="col-span-4 space-y-6">
                <div className="liquid-card p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-3">
                    EXPERIENCE
                  </h3>
                  <p className="font-jetbrains text-xs font-light text-gray-600 leading-relaxed">
                    5+ années dans le développement web et mobile avec une expertise en technologies modernes
                  </p>
                </div>
                <div className="liquid-card p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-3">
                    APPROACH
                  </h3>
                  <p className="font-jetbrains text-xs font-light text-gray-600 leading-relaxed">
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
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight">SPECIALIST</h1>
              </div>

              {/* Main skills grid */}
              <div className="col-span-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="liquid-card p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-blue-600 mr-4">{"</>"}</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide">
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

                  <div className="liquid-card p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-green-600 mr-4">[#]</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide">Mobile</h3>
                    </div>
                    <ul className="space-y-2 font-jetbrains text-sm font-light text-gray-700">
                      <li>• React Native</li>
                      <li>• Flutter</li>
                      <li>• Applications hybrides</li>
                      <li>• Intégration API</li>
                      <li>• Notifications push</li>
                    </ul>
                  </div>

                  <div className="liquid-card p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-purple-600 mr-4">[AI]</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide">
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

                  <div className="liquid-card p-8">
                    <div className="flex items-center mb-6">
                      <div className="font-kode text-3xl text-yellow-600 mr-4">{"{}"}</div>
                      <h3 className="font-jetbrains text-lg font-medium text-black uppercase tracking-wide">Tools</h3>
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
                <div className="liquid-card p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4">
                    EXPERTISE LEVEL
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs font-light">Frontend</span>
                        <span className="font-kode text-xs">95%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full" style={{ width: "95%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs font-light">Mobile</span>
                        <span className="font-kode text-xs">85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-green-600 h-1 rounded-full" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-jetbrains text-xs font-light">AI Integration</span>
                        <span className="font-kode text-xs">80%</span>
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
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight">PROJECTS</h1>
              </div>

              {/* Featured project */}
              <div className="col-span-12">
                <div className="liquid-card p-8 mb-8">
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8">
                      <h2 className="font-jetbrains text-2xl font-medium text-black mb-4 uppercase tracking-wide">
                        Portfolio 3D Interactif
                      </h2>
                      <p className="font-jetbrains text-base font-light text-gray-700 mb-6 leading-relaxed">
                        Site web avec navigation 3D immersive, effets de particules et animations fluides pour une
                        expérience utilisateur unique. Intégration d'effets visuels avancés et d'interactions
                        intuitives.
                      </p>
                      <div className="font-jetbrains text-xs font-light text-gray-600">
                        Technologies: React, Next.js, Three.js, TypeScript, Tailwind CSS
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-wrap gap-2 items-start">
                      <span className="tech-tag blue">React</span>
                      <span className="tech-tag blue">Three.js</span>
                      <span className="tech-tag blue">WebGL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other projects */}
              <div className="col-span-6">
                <div className="liquid-card p-6 mb-6">
                  <h3 className="font-jetbrains text-lg font-medium text-black mb-3 uppercase tracking-wide">
                    App Mobile E-commerce
                  </h3>
                  <p className="font-jetbrains text-sm font-light text-gray-700 mb-4 leading-relaxed">
                    Application mobile complète avec système de paiement intégré et interface utilisateur optimisée.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="tech-tag green">React Native</span>
                    <span className="tech-tag green">Stripe</span>
                  </div>
                </div>
              </div>

              <div className="col-span-6">
                <div className="liquid-card p-6 mb-6">
                  <h3 className="font-jetbrains text-lg font-medium text-black mb-3 uppercase tracking-wide">
                    Assistant IA Personnalisé
                  </h3>
                  <p className="font-jetbrains text-sm font-light text-gray-700 mb-4 leading-relaxed">
                    Chatbot intelligent avec analyse de documents et automatisation de tâches complexes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="tech-tag purple">OpenAI</span>
                    <span className="tech-tag purple">Python</span>
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
                <h1 className="font-kode text-6xl font-bold text-black mb-12 tracking-tight">CONTACT</h1>
                <div className="liquid-card p-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4">
                        GET IN TOUCH
                      </h3>
                      <div className="space-y-3 font-jetbrains text-sm font-light">
                        <div>
                          <span className="text-blue-600 uppercase tracking-wide">Email</span>
                          <p className="text-gray-700">contact@nomad403.dev</p>
                        </div>
                        <div>
                          <span className="text-blue-600 uppercase tracking-wide">Phone</span>
                          <p className="text-gray-700">+33 (0)1 23 45 67 89</p>
                        </div>
                        <div>
                          <span className="text-blue-600 uppercase tracking-wide">Location</span>
                          <p className="text-gray-700">France, Remote Available</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4">
                        SOCIAL LINKS
                      </h3>
                      <div className="space-y-3 font-jetbrains text-sm font-light">
                        <div>
                          <span className="text-green-600 uppercase tracking-wide">LinkedIn</span>
                          <p className="text-gray-700">/in/nomad403</p>
                        </div>
                        <div>
                          <span className="text-green-600 uppercase tracking-wide">GitHub</span>
                          <p className="text-gray-700">/nomad403</p>
                        </div>
                        <div>
                          <span className="text-green-600 uppercase tracking-wide">Twitter</span>
                          <p className="text-gray-700">@nomad403</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-4">
                <div className="liquid-card p-6">
                  <h3 className="font-jetbrains text-sm font-medium text-black uppercase tracking-wide mb-4">
                    AVAILABILITY
                  </h3>
                  <p className="font-jetbrains text-xs font-light text-gray-700 leading-relaxed mb-4">
                    Ouvert aux nouvelles opportunités et collaborations
                  </p>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-jetbrains text-xs font-light text-green-600 uppercase tracking-wide">
                      Available
                    </span>
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
    <div className="absolute inset-0 z-25 bg-white/30 backdrop-blur-sm">
      <div className="container mx-auto px-8 py-8 h-full overflow-y-auto">
        <button
          onClick={onBack}
          className="liquid-button flex items-center space-x-2 text-black font-jetbrains text-sm font-light mb-8 px-4 py-2 transition-all duration-300 uppercase tracking-wide"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {getPageContent()}
      </div>
    </div>
  )
}
