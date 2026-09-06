"use client"

import ProjectsPageContent from "./ProjectsPageContent"
import SpecialistPageContent from "./SpecialistPageContent"
import ContactPageContent from "./ContactPageContent"

interface ContentPagesProps {
  currentPage: string
}

export default function ContentPages({ currentPage }: ContentPagesProps) {
  const getPageContent = () => {
    switch (currentPage) {
      case "specialist":
        return <SpecialistPageContent />
      case "projects":
        return <ProjectsPageContent />
      case "contact":
        return <ContactPageContent />
      default:
        return null
    }
  }

  return (
    <div className="pointer-events-auto relative z-20 h-full w-full overflow-hidden">
      {getPageContent()}

      <div className="sr-only">
        <nav aria-label="Navigation contextuelle SEO">
          <ul>
            <li>
              <a href="https://www.nomad403.com/">Retour à l&apos;accueil</a>
            </li>
            {currentPage === "projects" && (
              <>
                <li>
                  <a href="https://www.nomad403.com/specialist">
                    Voir mes compétences techniques développeur freelance Paris
                  </a>
                </li>
                <li>
                  <a href="https://www.nomad403.com/contact">
                    Me contacter pour un projet React Next.js Kotlin Swift
                  </a>
                </li>
              </>
            )}
            {currentPage === "specialist" && (
              <>
                <li>
                  <a href="https://www.nomad403.com/projects">
                    Voir mes réalisations développement web mobile
                  </a>
                </li>
                <li>
                  <a href="https://www.nomad403.com/contact">
                    Discuter de vos besoins techniques développeur freelance
                  </a>
                </li>
              </>
            )}
            {currentPage === "contact" && (
              <>
                <li>
                  <a href="https://www.nomad403.com/projects">
                    Découvrir mes projets React Next.js Kotlin Swift
                  </a>
                </li>
                <li>
                  <a href="https://www.nomad403.com/specialist">
                    Consulter mes compétences développeur web mobile
                  </a>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div>
          <h3>Expertise technique</h3>
          <ul>
            <li>
              <a href="https://www.nomad403.com/projects">
                Portfolio développeur React Next.js TypeScript
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/specialist">
                Expertise Kotlin Swift mobile iOS Android
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/contact">
                Développeur freelance Paris web mobile
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/specialist">
                Intégration IA Azure OpenAI développeur expert
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/contact">
                Devis gratuit développeur web mobile freelance
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
