export type {
  LocalizedCopy,
  SpecialistCategory,
  SpecialistLang,
  SpecialistService,
} from "@/lib/specialist-types"

export { SPECIALIST_CATALOG } from "@/lib/specialist-catalog-data"

import type { LocalizedCopy, SpecialistLang } from "@/lib/specialist-types"

export function pickLocalized(
  copy: LocalizedCopy,
  lang: SpecialistLang,
): string {
  return copy[lang]
}
