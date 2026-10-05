import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

const PRESETS = {
  "1080": { logicalWidth: 360, logicalHeight: 640, deviceScaleFactor: 3 },
  "1440": { logicalWidth: 360, logicalHeight: 640, deviceScaleFactor: 4 },
  "4k": { logicalWidth: 360, logicalHeight: 640, deviceScaleFactor: 6 },
  "8k": { logicalWidth: 360, logicalHeight: 640, deviceScaleFactor: 12 },
}

const args = new Map(
  process.argv.slice(2).filter((arg) => arg.startsWith("--")).map((arg) => {
    const [key, value = "true"] = arg.slice(2).split("=", 2)
    return [key, value]
  }),
)
const presetName = args.get("preset") ?? "1080"
const route = args.get("route") ?? "/"
const baseUrl = args.get("base-url") ?? "http://127.0.0.1:3000"
const headed = args.has("headed")
const preset = PRESETS[presetName]

if (!preset) {
  throw new Error(`Unknown preset '${presetName}'. Use: ${Object.keys(PRESETS).join(", ")}`)
}

function captureUrl() {
  const url = new URL(route, baseUrl)
  url.searchParams.set("capture", "1")
  return url.toString()
}

async function readGeometry(page) {
  return page.evaluate(() => {
    const selectors = {
      header: "nav.site-chrome",
      homeTitle: '[data-capture="home-title"]',
      brand: '[data-capture="home-brand"]',
      navigation: "nav.site-chrome",
    }
    const read = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      media: {
        mobile: matchMedia("(max-width: 767px)").matches,
        md: matchMedia("(min-width: 768px)").matches,
      },
      elements: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, read(selector)])),
    }
  })
}

async function run(name) {
  const config = PRESETS[name]
  const browser = await chromium.launch({ channel: "chrome", headless: !headed })
  const context = await browser.newContext({
    viewport: { width: config.logicalWidth, height: config.logicalHeight },
    deviceScaleFactor: config.deviceScaleFactor,
  })
  const page = await context.newPage()
  // The spheres module is loaded from a CDN and can keep connections alive;
  // waiting for network idle would make a deterministic capture hang.
  await page.goto(captureUrl(), { waitUntil: "domcontentloaded" })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1_500)

  const outputDir = join(process.cwd(), "artifacts", "captures")
  mkdirSync(outputDir, { recursive: true })
  const imagePath = join(outputDir, `${name}-${route.replaceAll("/", "_") || "home"}.png`)
  await page.screenshot({ path: imagePath })
  // A DPR-6 WebGL frame can delay React's progressive home content. Measuring
  // after the compositor has completed the screenshot captures the settled DOM.
  await page.waitForTimeout(2_000)
  const geometry = await readGeometry(page)
  writeFileSync(join(outputDir, `${name}-${route.replaceAll("/", "_") || "home"}.json`), `${JSON.stringify(geometry, null, 2)}\n`)
  await browser.close()
  return { imagePath, geometry }
}

if (args.has("validate")) {
  const results = {}
  for (const name of ["1080", "1440", "4k"]) results[name] = await run(name)
  const baseline = JSON.stringify(results["1080"].geometry.elements)
  for (const name of ["1440", "4k"]) {
    if (JSON.stringify(results[name].geometry.elements) !== baseline) {
      throw new Error(`CSS geometry differs for preset ${name}; inspect artifacts/captures.`)
    }
  }
  console.log("Validated identical CSS geometry at DPR 3, 4 and 6.")
} else {
  const result = await run(presetName)
  console.log(`Captured ${result.imagePath}`)
  console.log(JSON.stringify(result.geometry, null, 2))
}
