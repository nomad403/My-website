export type SpecialistLang = "fr" | "en"

export interface LocalizedCopy {
  fr: string
  en: string
}

export interface SpecialistService {
  id: string
  title: LocalizedCopy
  description: LocalizedCopy
}

export interface SpecialistCategory {
  id: string
  title: LocalizedCopy
  services: SpecialistService[]
}
