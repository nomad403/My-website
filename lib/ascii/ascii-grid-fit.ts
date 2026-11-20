/**
 * Pick a column/row count so each ASCII cell lands on (near) integer device
 * pixels. Fractional cell widths create regularly spaced vertical moiré seams.
 */
export function snapAsciiAxisCount(bufferPx: number, idealCellPx: number) {
  const size = Math.max(1, Math.floor(bufferPx))
  const ideal = Math.max(1, idealCellPx)
  const approximate = Math.max(1, Math.round(size / ideal))

  let best = approximate
  let bestScore = Number.POSITIVE_INFINITY

  for (let delta = 0; delta <= 64; delta += 1) {
    const candidates =
      delta === 0 ? [approximate] : [approximate - delta, approximate + delta]
    for (const candidate of candidates) {
      if (candidate < 16 || candidate > size) continue
      const cell = size / candidate
      const fractional = Math.abs(cell - Math.round(cell))
      const densityDrift = Math.abs(cell - ideal) / ideal
      // Prefer exact divisors heavily; keep density close to the design size.
      const score = fractional * 20 + densityDrift
      if (score < bestScore) {
        bestScore = score
        best = candidate
      }
      if (fractional < 1e-9 && densityDrift < 0.08) return candidate
    }
  }

  return best
}
