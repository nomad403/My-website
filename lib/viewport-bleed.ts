/** Dépassement du viewport pour masquer les liserés blancs (grille ASCII / 100vw). */
export const VIEWPORT_BLEED_PX = 8

export function viewportBleedInsets() {
  const bleed = VIEWPORT_BLEED_PX
  const span = bleed * 2
  return {
    top: -bleed,
    left: -bleed,
    width: `calc(100% + ${span}px)`,
    height: `calc(100% + ${span}px)`,
  } as const
}
