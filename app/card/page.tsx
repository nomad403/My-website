import type { Metadata } from "next"
import HeaderLogo from "@/components/chrome/HeaderLogo"
import ShareCard from "@/components/card/ShareCard"
import { cardProfile as profile } from "@/lib/card/profile"
import styles from "./card.module.css"

const title = `${profile.displayName} — Nomad403`
const description = "Développeur & Consultant : web, mobile, intelligence artificielle et automatisation. Retrouvez Glenn-Richard et enregistrez ses coordonnées."

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: profile.canonicalUrl },
  openGraph: {
    title, description, url: profile.canonicalUrl, type: "website", siteName: profile.company, locale: "fr_FR",
    images: [{ url: "https://nomad403.com/images/portfolio.webp", alt: "Portfolio NOMAD403" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["https://nomad403.com/images/portfolio.webp"] },
}

export default function CardPage() {
  return (
    <main className={styles.page} lang="fr" id="card-main">
      <div className={styles.inner}>
        <header className={styles.header}>
          <a href={profile.website} aria-label="NOMAD403 — Accéder au portfolio"><HeaderLogo mode="day" variant="loader" /></a>
          <span className={styles.eyebrow}>Faisons connaissance <span aria-hidden className={styles.dot}>●</span></span>
        </header>
        <div className={styles.layout}>
          <section className={styles.identity} aria-labelledby="card-name">
            <p className={styles.eyebrow}>Développement · Conseil</p>
            <h1 id="card-name" className={styles.name}>{profile.displayName}</h1>
            <p className={styles.role}>{profile.role}</p>
            <p className={styles.introduction}>{profile.introduction}</p>
            <ul className={styles.expertise} aria-label="Expertises">
              {profile.expertise.map(item => <li key={item}>{item}</li>)}
            </ul>
            <nav className={styles.socials} aria-label="Profils professionnels">
              {profile.socials.map(link => <a href={link.url} key={link.url} target="_blank" rel="noopener noreferrer">
                {link.label} <span aria-hidden>↗</span><span className={styles.srOnly}> (nouvel onglet)</span>
              </a>)}
            </nav>
          </section>
          <section className={styles.contact} aria-label="Contact et partage">
            <a className={`${styles.action} ${styles.primary}`} href="/glenn-richard.vcf" download="glenn-richard.vcf">
              <span className={styles.number} aria-hidden>01</span><span>Ajouter aux contacts</span><span aria-hidden>↓</span>
            </a>
            <p className={styles.contactNote}>Ouvrez le fichier puis confirmez l’ajout dans votre application Contacts.</p>
            <a className={styles.action} href={`mailto:${profile.email}`}>
              <span className={styles.number} aria-hidden>02</span><span>Envoyer un email<span className={styles.detail}>{profile.email}</span></span><span aria-hidden>↗</span>
            </a>
            <a className={styles.action} href={`tel:${profile.phone}`}>
              <span className={styles.number} aria-hidden>03</span><span>Appeler<span className={styles.detail}>{profile.phoneDisplay}</span></span><span aria-hidden>↗</span>
            </a>
            <a className={styles.action} href={profile.website}>
              <span className={styles.number} aria-hidden>04</span><span>Consulter le portfolio</span><span aria-hidden>↗</span>
            </a>
            <ShareCard url={profile.cardUrl} title={title} />
            <details className={styles.qr}>
              <summary>Afficher le QR code <span aria-hidden>＋</span></summary>
              <div className={styles.qrContent}>
                {/* Local vector image keeps the quiet zone and remains crisp. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/card/qr.svg" width="240" height="240" alt="QR code pour ouvrir la carte de visite NOMAD403" />
                <p>À scanner pour garder le contact.</p>
                <a href="/card/qr.svg" download="nomad403-card.svg">Télécharger le QR code ↓</a>
              </div>
            </details>
          </section>
        </div>
        <footer className={styles.footer}>
          <span className={styles.brand} aria-hidden>nomad403</span>
          <span className={styles.eyebrow}>Des idées. Du code. Des expériences.</span>
        </footer>
      </div>
    </main>
  )
}
