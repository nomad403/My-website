import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.AUDIT_URL ?? "http://127.0.0.1:3000"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const desktopViewport = { width: 1080, height: 1920 }

async function readResolution(page) {
  const canvas = page.locator('[data-ascii-renderer="gpu"]')
  await canvas.waitFor({ state: "visible", timeout: 30000 })
  return canvas.evaluate(canvas => ({
    width: canvas.width,
    height: canvas.height,
    fontPx: Number(canvas.dataset.asciiFontPx),
    grid: canvas.dataset.asciiGrid,
  }))
}

function assertBuffer(resolution, viewport, pixelBudget, dpr, capture) {
  const ratio = capture ? Math.min(dpr, 3)
    : Math.min(dpr, 1, Math.sqrt(pixelBudget / (viewport.width * viewport.height)))
  assert.equal(resolution.width, Math.floor(viewport.width * ratio))
  assert.equal(resolution.height, Math.floor(viewport.height * ratio))
  const rows = Number(resolution.grid.split("x")[1])
  assert.equal(rows, Math.ceil((viewport.height + 16) / resolution.fontPx))
}

try {
  for (const test of [
    { name: "mid", cores: 12, memory: 8, fontPx: 9, budget: 2000000, visits: 6 },
    { name: "high", cores: 12, memory: 16, fontPx: 7, budget: 4000000, visits: 1 },
    { name: "low", cores: 4, memory: 4, fontPx: 10, budget: 360000, visits: 1 },
    { name: "software GPU", cores: 12, memory: 16, fontPx: 10, budget: 360000, visits: 1, software: true },
    { name: "retina capture", cores: 12, memory: 8, fontPx: 9, budget: 2000000, visits: 1, dpr: 2, capture: true },
    { name: "mobile mid", cores: 12, memory: 8, fontPx: 4.875, desktopFontPx: 9, budget: 2000000, visits: 2, mobile: true, viewport: { width: 390, height: 844 } },
    { name: "mobile low", cores: 4, memory: 4, fontPx: 5, desktopFontPx: 10, budget: 360000, visits: 1, mobile: true, viewport: { width: 360, height: 800 } },
    { name: "small mobile", cores: 12, memory: 8, fontPx: 4, desktopFontPx: 9, budget: 2000000, visits: 1, mobile: true, viewport: { width: 320, height: 568 } },
  ]) {
    const viewport = test.viewport ?? desktopViewport
    const context = await browser.newContext({ viewport, deviceScaleFactor: test.dpr ?? 1, isMobile: test.mobile ?? false, hasTouch: test.mobile ?? false })
    await context.addInitScript(({ cores, memory, software }) => {
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores })
      Object.defineProperty(navigator, "deviceMemory", { get: () => memory })
      const visit = Number(sessionStorage.getItem("resolution-audit-visit") ?? "0")
      sessionStorage.setItem("resolution-audit-visit", String(visit + 1))
      // Simulate identical hardware with varying startup load/network hints.
      // The real scene still renders using Chrome's actual WebGL implementation.
      for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
        const original = type.prototype.getParameter
        type.prototype.getParameter = function (parameter) {
          return parameter === 37446
            ? software ? "SwiftShader diagnostic" : "Hardware GPU diagnostic"
            : original.call(this, parameter)
        }
      }
      Object.defineProperty(navigator, "connection", {
        get: () => ({ saveData: false, effectiveType: visit % 2 ? "2g" : "4g" }),
      })
      if (visit % 2) {
        const raf = window.requestAnimationFrame.bind(window)
        window.requestAnimationFrame = callback => raf(time => {
          if (performance.now() < 2500) setTimeout(() => callback(performance.now()), 150)
          else callback(time)
        })
      }
    }, test)
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text())
    })
    let expected
    for (let visit = 0; visit < test.visits; visit++) {
      await page.goto(`${baseUrl}/${test.capture ? "?capture=1" : ""}`, { waitUntil: "networkidle" })
      if (!test.capture) {
        await page.getByRole("button", { name: /Continuer sans son|Continue without sound/ }).click()
      }
      const resolution = await readResolution(page)
      assertBuffer(resolution, viewport, test.budget, test.dpr ?? 1, test.capture)
      assert.equal(resolution.fontPx, test.fontPx)
      if (expected) assert.deepEqual(resolution, expected, "definition must stay identical across visits")
      else expected = resolution
    }
    // Rapid portrait/landscape changes must converge to the final viewport.
    const landscape = { width: 1920, height: 1080 }
    await page.setViewportSize({ width: 720, height: 1280 })
    await page.setViewportSize(landscape)
    await page.waitForFunction(({ rows }) => document.querySelector("#webgl-canvas")?.dataset.asciiGrid?.endsWith(`x${rows}`), {
      rows: Math.ceil((landscape.height + 16) / (test.desktopFontPx ?? test.fontPx)),
    })
    assertBuffer(await readResolution(page), landscape, test.budget, test.dpr ?? 1, test.capture)
    if (test.mobile) {
      const rotated = { width: viewport.height, height: viewport.width }
      await page.setViewportSize(rotated)
      await page.waitForFunction(({ fontPx, rows }) => {
        const canvas = document.querySelector("#webgl-canvas")
        return Number(canvas?.dataset.asciiFontPx) === fontPx && canvas?.dataset.asciiGrid?.endsWith(`x${rows}`)
      }, { fontPx: test.fontPx, rows: Math.ceil((rotated.height + 16) / test.fontPx) })
      assert.equal((await readResolution(page)).fontPx, test.fontPx, "rotation preserves character size")
      assertBuffer(await readResolution(page), rotated, test.budget, test.dpr ?? 1, test.capture)
    }
    await page.setViewportSize(viewport)
    await page.waitForFunction(({ grid }) => document.querySelector("#webgl-canvas")?.dataset.asciiGrid === grid, expected)
    assert.deepEqual(await readResolution(page), expected)
    assert.deepEqual(errors, [])
    console.log(`PASS ${test.name}: ${test.visits} visits, ${expected.width}x${expected.height}, ${expected.fontPx}px glyphs, resize round trip`)
    await context.close()
  }
} finally {
  await browser.close()
}
