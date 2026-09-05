import { ASCII_LUMINANCE_GRADIENT } from "@/lib/ascii-gradient"
import type { AsciiTextGrid } from "@/lib/raster-text-ascii"

const LEVELS = ASCII_LUMINANCE_GRADIENT.length - 1

export interface AsciiLevelGrid {
  cols: number
  rows: number
  levels: Uint8Array
}

export function asciiGridToLevelGrid(grid: AsciiTextGrid): AsciiLevelGrid {
  const levels = new Uint8Array(grid.cols * grid.rows)
  for (const cell of grid.cells) {
    levels[cell.row * grid.cols + cell.col] = cell.levelIndex
  }
  return { cols: grid.cols, rows: grid.rows, levels }
}

/** Variation légère autour du niveau de base — conserve la forme globale. */
export function animateAsciiChar(
  baseIndex: number,
  tick: number,
  col: number,
  row: number,
): string {
  const phase = col * 0.73 + row * 1.09
  const t = tick * 0.42 + phase
  const wave1 = Math.sin(t)
  const wave2 = Math.sin(t * 1.31 + phase * 1.7)
  const wave3 = Math.sin(t * 0.67 + phase * 0.43) * 0.35
  const mix = wave1 * 0.45 + wave2 * 0.4 + wave3
  const spread = baseIndex > LEVELS * 0.72 ? 1 : 2
  const offset = Math.round(mix * spread)
  const index = Math.max(0, Math.min(LEVELS, baseIndex + offset))

  return ASCII_LUMINANCE_GRADIENT[index] ?? " "
}

export function buildAsciiFrame(grid: AsciiLevelGrid, tick: number): string {
  const { cols, rows, levels } = grid
  const rowLines: string[] = new Array(rows)

  for (let row = 0; row < rows; row++) {
    let line = ""
    const rowOffset = row * cols
    for (let col = 0; col < cols; col++) {
      const base = levels[rowOffset + col]
      line += base ? animateAsciiChar(base, tick, col, row) : " "
    }
    rowLines[row] = line
  }

  return rowLines.join("\n")
}

export function buildStaticAsciiFrame(grid: AsciiLevelGrid): string {
  return buildAsciiFrame(grid, 0)
}
