import { ASCII_LUMINANCE_GRADIENT } from "@/lib/ascii-gradient"
import { animateAsciiChar } from "@/lib/ascii-variation"
import type { AsciiLevelGrid } from "@/lib/ascii-variation"

export interface AsciiCell {
  col: number
  row: number
  char: string
  levelIndex: number
}

export interface AsciiTextGrid {
  cols: number
  rows: number
  lines: string[]
  cells: AsciiCell[]
  widthPx: number
  heightPx: number
}

export interface RasterTextOptions {
  text: string
  fontSize: number
  fontWeight: number | string
  fontFamily: string
  letterSpacingPx: number
  widthPx: number
  heightPx: number
  textOffsetX: number
  textOffsetY: number
  cellPx: number
}

function averageLuminance(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
): number {
  let sum = 0
  let count = 0

  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * width + x) * 4
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      count++
    }
  }

  return count > 0 ? sum / count : 255
}

export function rasterTextToAsciiGrid({
  text,
  fontSize,
  fontWeight,
  fontFamily,
  letterSpacingPx,
  widthPx,
  heightPx,
  textOffsetX,
  textOffsetY,
  cellPx,
}: RasterTextOptions): AsciiTextGrid | null {
  if (typeof document === "undefined" || !text || widthPx <= 0 || heightPx <= 0) {
    return null
  }

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  canvas.width = widthPx
  canvas.height = heightPx

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, widthPx, heightPx)
  ctx.fillStyle = "#000000"
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  if ("letterSpacing" in ctx && letterSpacingPx !== 0) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${letterSpacingPx}px`
  }
  ctx.textBaseline = "top"
  ctx.fillText(text, textOffsetX, textOffsetY)

  const { data } = ctx.getImageData(0, 0, widthPx, heightPx)
  const cols = Math.max(1, Math.ceil(widthPx / cellPx))
  const rows = Math.max(1, Math.ceil(heightPx / cellPx))
  const levels = ASCII_LUMINANCE_GRADIENT.length - 1
  const lines: string[] = []
  const cells: AsciiCell[] = []
  const inkThreshold = Math.round(levels * 0.08)

  for (let row = 0; row < rows; row++) {
    const y0 = row * cellPx
    const sampleH = Math.min(cellPx, heightPx - y0)
    let line = ""

    for (let col = 0; col < cols; col++) {
      const x0 = col * cellPx
      const sampleW = Math.min(cellPx, widthPx - x0)
      const lum = averageLuminance(data, widthPx, x0, y0, sampleW, sampleH)
      const shade = 255 - lum
      const index = Math.min(levels, Math.round((shade / 255) * levels))
      const char = ASCII_LUMINANCE_GRADIENT[index] ?? " "
      line += char

      if (index > inkThreshold) {
        cells.push({ col, row, char, levelIndex: index })
      }
    }

    lines.push(line)
  }

  return { cols, rows, lines, cells, widthPx, heightPx }
}

function readLetterSpacingPx(computed: CSSStyleDeclaration, fontSize: number): number {
  const spacing = computed.letterSpacing
  if (!spacing || spacing === "normal") return 0
  if (spacing.endsWith("px")) return parseFloat(spacing)
  if (spacing.endsWith("em")) return parseFloat(spacing) * fontSize
  return 0
}

export function getTextInkBounds(element: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(element)
  const textRect = range.getBoundingClientRect()
  const boxRect = element.getBoundingClientRect()

  return {
    offsetX: textRect.left - boxRect.left,
    offsetY: textRect.top - boxRect.top,
    width: element.offsetWidth,
    height: element.offsetHeight,
    textWidth: textRect.width,
    textHeight: textRect.height,
  }
}

export function getRasterOptionsFromElement(
  element: HTMLElement,
  text: string,
  cellPx: number,
): RasterTextOptions | null {
  const computed = getComputedStyle(element)
  const fontSize = parseFloat(computed.fontSize)
  const bounds = getTextInkBounds(element)
  if (bounds.width <= 0 || bounds.height <= 0) return null

  return {
    text,
    fontSize,
    fontWeight: computed.fontWeight,
    fontFamily: computed.fontFamily,
    letterSpacingPx: readLetterSpacingPx(computed, fontSize),
    widthPx: bounds.width,
    heightPx: bounds.height,
    textOffsetX: bounds.offsetX,
    textOffsetY: bounds.offsetY,
    cellPx,
  }
}

export function rasterTextFromElement(
  element: HTMLElement,
  cellPx: number,
): AsciiTextGrid | null {
  const options = getRasterOptionsFromElement(element, element.textContent ?? "", cellPx)
  if (!options) return null
  return rasterTextToAsciiGrid(options)
}

export function drawAsciiTextGrid(
  ctx: CanvasRenderingContext2D,
  grid: AsciiTextGrid,
  widthPx: number,
  heightPx: number,
  color: string,
) {
  ctx.clearRect(0, 0, widthPx, heightPx)
  const cellW = widthPx / grid.cols
  const cellH = heightPx / grid.rows
  const fontPx = Math.max(3, Math.min(cellW, cellH) * 0.92)

  ctx.fillStyle = color
  const enigma =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--font-enigma")
          .trim() || "ui-monospace"
      : "ui-monospace"
  ctx.font = `${fontPx}px ${enigma}, ui-monospace, monospace`
  ctx.textBaseline = "middle"
  ctx.textAlign = "center"

  for (let row = 0; row < grid.rows; row++) {
    const line = grid.lines[row] ?? ""
    for (let col = 0; col < grid.cols; col++) {
      const char = line[col] ?? " "
      if (char === " ") continue
      ctx.fillText(char, col * cellW + cellW / 2, row * cellH + cellH / 2)
    }
  }
}

export function drawAsciiFrame(
  ctx: CanvasRenderingContext2D,
  grid: AsciiLevelGrid,
  tick: number,
  widthPx: number,
  heightPx: number,
  color: string,
) {
  ctx.clearRect(0, 0, widthPx, heightPx)
  const cellW = widthPx / grid.cols
  const cellH = heightPx / grid.rows
  const fontPx = Math.max(3, Math.min(cellW, cellH) * 0.92)

  ctx.fillStyle = color
  const enigma =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--font-enigma")
          .trim() || "ui-monospace"
      : "ui-monospace"
  ctx.font = `${fontPx}px ${enigma}, ui-monospace, monospace`
  ctx.textBaseline = "middle"
  ctx.textAlign = "center"

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const base = grid.levels[row * grid.cols + col]
      if (!base) continue
      const char = animateAsciiChar(base, tick, col, row)
      ctx.fillText(char, col * cellW + cellW / 2, row * cellH + cellH / 2)
    }
  }
}
