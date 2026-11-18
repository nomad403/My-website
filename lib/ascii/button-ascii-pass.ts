import { ASCII_LUMINANCE_GRADIENT } from "@/lib/ascii/ascii-gradient"

export type ButtonAsciiOptions = {
  fontPx?: number
  /** Ink color for glyphs — shop background uses #ff0000. */
  color?: string
  /** Hidden liquid guide fill used only for sampling (never shown). */
  guideColor?: string
  invert?: boolean
  /** Match shop background analysis mode. */
  mode?: "plain" | "dither" | "sobel"
}

/**
 * Samples a hidden liquid guide (pill + flame blobs), then draws a full ASCII
 * field with the same glyph ramp as the shop background. The guide itself is
 * never painted onto the target canvas.
 */
export function renderButtonAsciiPass(
  target: HTMLCanvasElement,
  button: HTMLElement,
  options: ButtonAsciiOptions = {},
) {
  const fontPx = options.fontPx ?? 6
  const color = options.color ?? "#ff0000"
  const guideColor = options.guideColor ?? "#00e8ff"
  const invert = options.invert ?? false
  const mode = options.mode ?? "sobel"
  const glyphs = ASCII_LUMINANCE_GRADIENT

  const rect = button.getBoundingClientRect()
  const padX = Math.ceil(rect.width * 0.12)
  const padTop = Math.ceil(rect.height * 1.45)
  const padBottom = Math.ceil(rect.height * 0.2)
  const width = Math.max(1, Math.ceil(rect.width + padX * 2))
  const height = Math.max(1, Math.ceil(rect.height + padTop + padBottom))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  if (target.width !== Math.ceil(width * dpr) || target.height !== Math.ceil(height * dpr)) {
    target.width = Math.ceil(width * dpr)
    target.height = Math.ceil(height * dpr)
    target.style.width = `${width}px`
    target.style.height = `${height}px`
  }

  const source = document.createElement("canvas")
  source.width = Math.ceil(width * dpr)
  source.height = Math.ceil(height * dpr)
  const sctx = source.getContext("2d", { willReadFrequently: true })
  const tctx = target.getContext("2d")
  if (!sctx || !tctx) return

  sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  tctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  sctx.clearRect(0, 0, width, height)
  tctx.clearRect(0, 0, width, height)

  const radius = Math.min(rect.height / 2, 999)
  const pillX = padX
  const pillY = padTop

  // Hidden liquid guide — shape reference only.
  sctx.fillStyle = guideColor
  roundRect(sctx, pillX, pillY, rect.width, rect.height, radius)
  sctx.fill()

  const flames = button.querySelectorAll<HTMLElement>(".shop-subscribe__flame")
  flames.forEach((flame) => {
    const flameRect = flame.getBoundingClientRect()
    if (flameRect.width < 1 || flameRect.height < 1) return
    const fx = flameRect.left - rect.left + padX + flameRect.width / 2
    const fy = flameRect.top - rect.top + padTop + flameRect.height / 2
    const rx = flameRect.width / 2
    const ry = flameRect.height / 2
    sctx.fillStyle = guideColor
    sctx.beginPath()
    sctx.ellipse(fx, fy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2)
    sctx.fill()
  })

  // Tighter cells than the page field → higher glyph density / sharper curves.
  const cols = Math.max(16, Math.floor(width / (fontPx * 0.52)))
  const rows = Math.max(8, Math.floor(height / (fontPx * 0.92)))
  const cellW = width / cols
  const cellH = height / rows
  const image = sctx.getImageData(0, 0, source.width, source.height)
  const levels = new Float32Array(cols * rows)

  const sampleCoverage = (col: number, row: number) => {
    // 2×2 supersample for cleaner flame silhouettes at small font sizes.
    let sum = 0
    let count = 0
    for (let oy = 0; oy < 2; oy += 1) {
      for (let ox = 0; ox < 2; ox += 1) {
        const cx = Math.min(
          source.width - 1,
          Math.max(0, Math.floor((col + 0.25 + ox * 0.5) * cellW * dpr)),
        )
        const cy = Math.min(
          source.height - 1,
          Math.max(0, Math.floor((row + 0.25 + oy * 0.5) * cellH * dpr)),
        )
        const i = (cy * source.width + cx) * 4
        const a = image.data[i + 3] / 255
        if (a < 0.03) {
          count += 1
          continue
        }
        const r = image.data[i] / 255
        const g = image.data[i + 1] / 255
        const b = image.data[i + 2] / 255
        let value = 0.299 * r + 0.587 * g + 0.114 * b
        value = a * (0.55 + 0.45 * value)
        sum += invert ? 1 - value : value
        count += 1
      }
    }
    return count ? sum / count : 0
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let value = sampleCoverage(col, row)
      if (mode === "sobel") {
        let edge = 0
        if (col > 0 && row > 0 && col < cols - 1 && row < rows - 1) {
          const tl = sampleCoverage(col - 1, row - 1)
          const tc = sampleCoverage(col, row - 1)
          const tr = sampleCoverage(col + 1, row - 1)
          const ml = sampleCoverage(col - 1, row)
          const mr = sampleCoverage(col + 1, row)
          const bl = sampleCoverage(col - 1, row + 1)
          const bc = sampleCoverage(col, row + 1)
          const br = sampleCoverage(col + 1, row + 1)
          const gx = -tl + tr - 2 * ml + 2 * mr - bl + br
          const gy = -tl - 2 * tc - tr + bl + 2 * bc + br
          edge = Math.min(1, Math.hypot(gx, gy))
        }
        value = Math.min(1, value * 0.88 + edge * 0.62)
      } else if (mode === "dither") {
        const noise = fract(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453)
        value = clamp(value + (noise - 0.5) * (14 / 255), 0, 1)
      }
      levels[row * cols + col] = value
    }
  }

  tctx.font = `${fontPx}px Consolas, Monaco, "Liberation Mono", monospace`
  tctx.textBaseline = "top"
  tctx.fillStyle = color
  tctx.globalAlpha = 1

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const value = levels[row * cols + col]
      if (value < 0.03) continue
      const glyph = glyphs[Math.min(glyphs.length - 1, Math.floor(value * (glyphs.length - 1) + 0.5))]
      tctx.fillText(glyph, col * cellW, row * cellH)
    }
  }

  target.style.left = `${-padX}px`
  target.style.top = `${-padTop}px`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function fract(value: number) {
  return value - Math.floor(value)
}
