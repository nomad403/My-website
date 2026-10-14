import type { CardProfile } from "./profile"

export function escapeVCardText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;").replace(/,/g, "\\,")
}

/** Fold at 75 UTF-8 octets without splitting a code point. */
export function foldVCardLine(value: string) {
  const encoder = new TextEncoder()
  let line = ""
  let bytes = 0
  const lines: string[] = []
  for (const character of value) {
    const length = encoder.encode(character).length
    if (bytes + length > 75) {
      lines.push(line)
      line = " "
      bytes = 1
    }
    line += character
    bytes += length
  }
  lines.push(line)
  return lines.join("\r\n")
}

export function generateVCard(profile: CardProfile) {
  const text = escapeVCardText
  const lines = [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${text(profile.familyName)};${text(profile.givenName)};;;`,
    `FN:${text(profile.fullName)}`,
    `ORG:${text(profile.company)}`,
    `TITLE:${text(profile.role)}`,
    `TEL;TYPE=CELL,VOICE:${text(profile.phone)}`,
    `EMAIL;TYPE=INTERNET:${text(profile.email)}`,
    `URL:${text(profile.website)}`,
    "END:VCARD",
  ]
  return `${lines.map(foldVCardLine).join("\r\n")}\r\n`
}
