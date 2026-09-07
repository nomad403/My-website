/** Contenu SEO sr-only pour la home et la navigation interne globale. */

export default function HomeSeoBlock({ currentPage }: { currentPage: string }) {
  return (
    <>
      {currentPage === "home" && (
        <h1 className="sr-only">
          Nomad403 (Nomad 403) — Web, Mobile & AI Developer — Official site &
          portfolio
        </h1>
      )}

      <div className="sr-only">
        <nav aria-label="Navigation interne SEO">
          <ul>
            <li>
              <a href="https://www.nomad403.com/">
                Accueil - Développeur Web Mobile IA
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/projects">
                Portfolio Projets - Applications Web Mobile
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/specialist">
                Compétences Techniques - React Next.js Kotlin Swift
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/contact">
                Contact - Développeur Freelance Paris
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2>Services de développement</h2>
          <ul>
            <li>
              <a href="https://www.nomad403.com/projects">
                Développement d&apos;applications web React Next.js
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/projects">
                Applications mobiles iOS Android Kotlin Swift
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/specialist">
                Intégration IA et machine learning Azure OpenAI
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/specialist">
                Développeur freelance Paris React Next.js
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/specialist">
                Expert mobile Kotlin Swift iOS Android
              </a>
            </li>
            <li>
              <a href="https://www.nomad403.com/contact">
                Consulting technique développeur web mobile
              </a>
            </li>
          </ul>
        </div>
      </div>

      {currentPage === "home" && (
        <div className="sr-only">
          <p>
            Nomad403, Nomad 403, nomad-403 — développeur web mobile freelance
            basé à Paris. Spécialisé dans le développement d&apos;applications
            web React Next.js et mobiles iOS Android Kotlin Swift sur mesure
            pour startups, studios créatifs, marques de luxe et entreprises
            tech. Expertise en React, Next.js, TypeScript, Kotlin, Swift, et
            intégration d&apos;IA avec Azure OpenAI.
          </p>
          <p>
            Développeur freelance Paris expérimenté proposant des solutions
            digitales innovantes : applications web React Next.js performantes,
            applications mobiles natives iOS Android Kotlin Swift, intégration
            d&apos;intelligence artificielle, automatisation de processus
            métier. Approche centrée sur l&apos;expérience utilisateur, la
            performance et la scalabilité.
          </p>
          <p>
            Services : développement web full-stack React Next.js, applications
            mobiles cross-platform Kotlin Swift, intégration IA et machine
            learning, consulting technique, architecture de solutions, MVP et
            prototypage rapide. Technologies : Next.js, React, TypeScript,
            Tailwind CSS, Kotlin, Jetpack Compose, Swift, SwiftUI, Azure OpenAI,
            Power Automate, Three.js.
          </p>
          <p>
            Portfolio créatif et technique démontrant l&apos;excellence dans le
            développement d&apos;interfaces utilisateur modernes,
            d&apos;expériences interactives 3D, et de solutions
            d&apos;automatisation intelligente. Partenaire de confiance pour
            les projets ambitieux nécessitant expertise technique et vision
            créative.
          </p>
          <p>
            Recherches associées : nomad403 développeur, nomad 403 freelance,
            nomad-403 paris, nomad403 portfolio, nomad 403 web developer,
            nomad-403 mobile app, nomad403 react, nomad 403 typescript,
            nomad-403 kotlin, nomad403 swift, nomad 403 ai integration,
            développeur web mobile freelance paris, expert react next.js,
            développeur kotlin swift, intégration ia azure openai, portfolio
            développeur freelance.
          </p>

          <nav>
            <h3>Navigation interne</h3>
            <ul>
              <li>
                <a href="https://www.nomad403.com/projects">
                  Voir mes projets de développement web React Next.js et mobile
                  Kotlin Swift
                </a>
              </li>
              <li>
                <a href="https://www.nomad403.com/specialist">
                  Découvrir mes compétences techniques développeur freelance
                  Paris
                </a>
              </li>
              <li>
                <a href="https://www.nomad403.com/contact">
                  Me contacter pour un projet web mobile IA
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
