import { cardProfile } from "@/lib/card/profile"

export type LegalSectionId = "mentions" | "privacy" | "terms"

export interface LegalField {
  label: string
  value: string
  pending?: boolean
}

export interface LegalBlock {
  title: string
  body?: string[]
  fields?: LegalField[]
}

export interface LegalSection {
  id: LegalSectionId
  nav: string
  blocks: LegalBlock[]
}

export interface LegalCopy {
  close: string
  pendingNote: string
  sections: LegalSection[]
}

const host = {
  name: "Cloudflare, Inc.",
  address: "101 Townsend Street, San Francisco, CA 94107, États-Unis",
  site: "https://www.cloudflare.com",
}

export const LEGAL_FR: LegalCopy = {
  close: "Fermer",
  pendingNote: "Mentions « à préciser » : à compléter (immatriculation).",
  sections: [
    {
      id: "mentions",
      nav: "Mentions",
      blocks: [
        {
          title: "Éditeur",
          fields: [
            { label: "Nom", value: cardProfile.fullName },
            { label: "Enseigne", value: cardProfile.company },
            { label: "Statut", value: "Entrepreneur individuel", pending: true },
            { label: "Siège", value: "France", pending: true },
            { label: "SIREN", value: "À préciser", pending: true },
            { label: "TVA", value: "À préciser", pending: true },
            { label: "Email", value: cardProfile.email },
            { label: "Tél.", value: cardProfile.phoneDisplay },
          ],
        },
        {
          title: "Hébergement",
          fields: [
            { label: "Hébergeur", value: host.name },
            { label: "Adresse", value: host.address },
            { label: "Site", value: host.site },
          ],
        },
      ],
    },
    {
      id: "privacy",
      nav: "Confidentialité",
      blocks: [
        {
          title: "Responsable",
          body: [`${cardProfile.fullName} — ${cardProfile.email}`],
        },
        {
          title: "Données",
          body: [
            "Contact : nom, moyen de contact, message.",
            "Shop / compte : identifiants et facturation (Stripe le cas échéant).",
            "Local : langue, son, choix d’expérience (stockage navigateur).",
            "Logs hébergeur : connexion (sécurité).",
          ],
        },
        {
          title: "Finalités",
          body: [
            "Répondre aux demandes, exécuter le Shop, sécuriser le site.",
            "Capteurs mobile : expérience visuelle locale, après action volontaire — pas de pub.",
          ],
        },
        {
          title: "Durées",
          body: [
            "Contact : le temps du suivi.",
            "Compte / facturation : durée légale.",
            "Préférences locales : jusqu’à effacement navigateur.",
          ],
        },
        {
          title: "Droits",
          body: [
            "Accès, rectification, effacement, opposition, portabilité le cas échéant.",
            "CNIL : www.cnil.fr — demande : email ci-dessus.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "Pas de cookies pubs / analytics tiers par défaut.",
            "Stockage local technique pour le service (langue, audio, expérience).",
          ],
        },
      ],
    },
    {
      id: "terms",
      nav: "CGV",
      blocks: [
        {
          title: "Objet",
          body: [
            "Offres Shop NOMAD403 (accompagnement, abonnements, interventions). Un devis écrit prévaut s’il précise autrement.",
          ],
        },
        {
          title: "Prix",
          body: [
            "Euros ; TVA selon statuts. Paiement Stripe — pas de stockage de carte.",
          ],
        },
        {
          title: "Exécution",
          body: [
            "Délais indicatifs sauf écrit. Usage loyal des espaces clients.",
          ],
        },
        {
          title: "Rétractation",
          body: [
            "14 jours possibles pour les consommateurs selon la prestation ; exceptions possibles si exécution immédiate demandée.",
          ],
        },
        {
          title: "Responsabilité",
          body: [
            "Dommages directs limités aux montants payés pour la prestation, hors règles d’ordre public.",
          ],
        },
        {
          title: "Litiges",
          body: [
            "Droit français. Médiation conso : à préciser avant ventes B2C récurrentes.",
          ],
        },
      ],
    },
  ],
}

export const LEGAL_EN: LegalCopy = {
  close: "Close",
  pendingNote: "“To confirm” fields: complete once registered.",
  sections: [
    {
      id: "mentions",
      nav: "Legal",
      blocks: [
        {
          title: "Publisher",
          fields: [
            { label: "Name", value: cardProfile.fullName },
            { label: "Brand", value: cardProfile.company },
            { label: "Status", value: "Sole trader", pending: true },
            { label: "Address", value: "France", pending: true },
            { label: "SIREN", value: "To confirm", pending: true },
            { label: "VAT", value: "To confirm", pending: true },
            { label: "Email", value: cardProfile.email },
            { label: "Phone", value: cardProfile.phoneDisplay },
          ],
        },
        {
          title: "Hosting",
          fields: [
            { label: "Host", value: host.name },
            { label: "Address", value: host.address },
            { label: "Site", value: host.site },
          ],
        },
      ],
    },
    {
      id: "privacy",
      nav: "Privacy",
      blocks: [
        {
          title: "Controller",
          body: [`${cardProfile.fullName} — ${cardProfile.email}`],
        },
        {
          title: "Data",
          body: [
            "Contact: name, channel, message.",
            "Shop / account: IDs and billing (Stripe when used).",
            "Local: language, sound, experience choice (browser storage).",
            "Host logs: connection data (security).",
          ],
        },
        {
          title: "Purposes",
          body: [
            "Answer requests, run Shop, keep the site secure.",
            "Mobile sensors: local visual experience after voluntary action — no ads.",
          ],
        },
        {
          title: "Retention",
          body: [
            "Contact: while handling the request.",
            "Account / billing: legal retention.",
            "Local prefs: until you clear site data.",
          ],
        },
        {
          title: "Rights",
          body: [
            "Access, rectification, erasure, objection, portability where applicable.",
            "CNIL: www.cnil.fr — requests via the email above.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "No third-party ad/analytics cookies by default.",
            "Local technical storage for the service (language, audio, experience).",
          ],
        },
      ],
    },
    {
      id: "terms",
      nav: "Terms",
      blocks: [
        {
          title: "Scope",
          body: [
            "NOMAD403 Shop offers (support, subscriptions, interventions). A written quote prevails if it says otherwise.",
          ],
        },
        {
          title: "Price",
          body: [
            "Euros; VAT by status. Stripe payments — no card storage.",
          ],
        },
        {
          title: "Delivery",
          body: [
            "Timelines indicative unless written. Fair use of client areas.",
          ],
        },
        {
          title: "Withdrawal",
          body: [
            "14 days may apply for consumers; exceptions if immediate digital start is requested.",
          ],
        },
        {
          title: "Liability",
          body: [
            "Direct damages capped at amounts paid for the service, subject to mandatory law.",
          ],
        },
        {
          title: "Disputes",
          body: [
            "French law. Consumer mediation: to confirm before recurring B2C sales.",
          ],
        },
      ],
    },
  ],
}
