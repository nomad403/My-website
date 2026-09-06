export type ContactField = "nom" | "contact" | "message"

export type ContactValidationCode =
  | "required"
  | "nom_invalid"
  | "nom_too_short"
  | "nom_too_long"
  | "contact_invalid"
  | "contact_too_long"
  | "message_too_short"
  | "message_too_long"
  | "message_invalid"

export const CONTACT_LIMITS = {
  nom: { min: 2, max: 80 },
  contact: { max: 100 },
  message: { min: 10, max: 2000 },
} as const

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Nom / structure : lettres (accents), chiffres, espaces et ponctuation légère. */
const NOM_DISALLOWED = /[^0-9A-Za-zÀ-ÖØ-öø-ÿŒœÆæ'\-.\s&]/
const NOM_VALID =
  /^[0-9A-Za-zÀ-ÖØ-öø-ÿŒœÆæ](?:[0-9A-Za-zÀ-ÖØ-öø-ÿŒœÆæ'\-.\s&]*[0-9A-Za-zÀ-ÖØ-öø-ÿŒœÆæ.])?$/

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

const PHONE_RE = /^\+?[0-9](?:[0-9.\s()-]{6,18}[0-9])$/

/** Message : bloque les balises / schémas dangereux évidents. */
const MESSAGE_DANGEROUS =
  /<\s*script|javascript:|data:text\/html|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed/i

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export function sanitizeNomInput(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(new RegExp(NOM_DISALLOWED.source, "g"), "")
    .slice(0, CONTACT_LIMITS.nom.max)
}

export function sanitizeContactInput(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/[^\w@.+#&*'/=?^`{|}~!$\-()\s]/g, "")
    .slice(0, CONTACT_LIMITS.contact.max)
}

export function sanitizeMessageInput(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/\r\n/g, "\n")
    .slice(0, CONTACT_LIMITS.message.max)
}

export function sanitizeContactPayload(input: {
  nom?: string
  contact?: string
  message?: string
}) {
  return {
    nom: collapseSpaces(sanitizeNomInput(input.nom ?? "")),
    contact: collapseSpaces(sanitizeContactInput(input.contact ?? "")),
    message: sanitizeMessageInput(input.message ?? "").trim(),
  }
}

export function isValidContactValue(contact: string): boolean {
  if (contact.includes("@")) return EMAIL_RE.test(contact)
  const digits = contact.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 15 && PHONE_RE.test(contact)
}

export function validateContactField(
  field: ContactField,
  raw: string,
): ContactValidationCode | null {
  const value = raw.trim()

  if (!value) return "required"

  if (field === "nom") {
    if (value.length < CONTACT_LIMITS.nom.min) return "nom_too_short"
    if (value.length > CONTACT_LIMITS.nom.max) return "nom_too_long"
    if (!NOM_VALID.test(value) || NOM_DISALLOWED.test(value)) return "nom_invalid"
    return null
  }

  if (field === "contact") {
    if (value.length > CONTACT_LIMITS.contact.max) return "contact_too_long"
    if (!isValidContactValue(value)) return "contact_invalid"
    return null
  }

  if (value.length < CONTACT_LIMITS.message.min) return "message_too_short"
  if (value.length > CONTACT_LIMITS.message.max) return "message_too_long"
  if (MESSAGE_DANGEROUS.test(value)) return "message_invalid"
  return null
}

export function validateContactPayload(payload: {
  nom: string
  contact: string
  message: string
}): { ok: true } | { ok: false; field: ContactField; code: ContactValidationCode } {
  for (const field of ["nom", "contact", "message"] as const) {
    const code = validateContactField(field, payload[field])
    if (code) return { ok: false, field, code }
  }
  return { ok: true }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
