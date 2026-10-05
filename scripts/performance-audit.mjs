import { chromium } from "playwright"

// Run against a production server; report the renderer as software WebGL does
// not represent the frame rate of a hardware-accelerated desktop browser.
const baseUrl = process.env.AUDIT_URL ?? "http://127.0.0.1:3000"
const cpuRate = Number(process.env.AUDIT_CPU ?? 4)
const browser = await chromium.launch({ channel: "chrome", headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.addInitScript(() => {
    window.__performanceAudit = { lcp: [], shifts: [], longTasks: [], readbacks: 0 }
    const metrics = window.__performanceAudit
    const original = CanvasRenderingContext2D.prototype.getImageData
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      metrics.readbacks++
      return original.apply(this, args)
    }
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      metrics.lcp.push({ timeMs: entry.startTime, element: entry.element?.tagName })
    })).observe({ type: "largest-contentful-paint", buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) metrics.shifts.push(entry.value)
    })).observe({ type: "layout-shift", buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      metrics.longTasks.push({ startMs: entry.startTime, durationMs: entry.duration })
    })).observe({ type: "longtask", buffered: true })
  })
  const client = await page.context().newCDPSession(page)
  await client.send("Emulation.setCPUThrottlingRate", { rate: cpuRate })
  await client.send("Network.enable")
  await client.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750,
  })
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" })
  await page.locator(".audio-gate").waitFor({ state: "visible" })
  await page.waitForTimeout(3000)
  const entry = await page.evaluate(() => ({ ...window.__performanceAudit }))
  const enteredAt = await page.evaluate(() => performance.now())
  await page.getByRole("button", { name: /Continue without sound|Continuer sans son/ }).click()
  await page.locator('[data-ascii-renderer="gpu"]').waitFor({ state: "visible", timeout: 30000 })
  const asciiReadyAt = await page.evaluate(() => performance.now())
  await page.waitForTimeout(2000)
  const animation = await page.evaluate(async () => {
    const audit = window.__performanceAudit
    const start = performance.now()
    const reads = audit.readbacks
    const intervals = []
    let last = start
    await new Promise(resolve => {
      const tick = now => {
        intervals.push(now - last)
        last = now
        if (now - start >= 5000) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    const canvas = document.querySelector('[data-ascii-renderer="gpu"]')
    const gl = canvas.getContext("webgl2")
    const extension = gl.getExtension("WEBGL_debug_renderer_info")
    const tasks = audit.longTasks.filter(task => task.startMs >= start)
    return {
      fps: intervals.length * 1000 / (last - start),
      frameP95Ms: intervals.sort((a, b) => a - b)[Math.floor(intervals.length * 0.95)],
      readbacks: audit.readbacks - reads,
      longTasks: {
        count: tasks.length,
        totalMs: tasks.reduce((sum, task) => sum + task.durationMs, 0),
        maxMs: Math.max(0, ...tasks.map(task => task.durationMs)),
      },
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : "unknown",
      buffer: { width: canvas.width, height: canvas.height },
    }
  })
  const startup = await page.evaluate(({ enteredAt, asciiReadyAt }) => ({
    asciiReadyMs: asciiReadyAt - enteredAt,
    longTasks: window.__performanceAudit.longTasks.filter(task => task.startMs >= enteredAt && task.startMs <= asciiReadyAt),
  }), { enteredAt, asciiReadyAt })
  console.log(JSON.stringify({ cpuRate, entry, startup, animation, errors }, null, 2))
  if (errors.length || animation.readbacks !== 0) process.exitCode = 1
} finally {
  await browser.close()
}
