import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.AUDIT_URL ?? "http://127.0.0.1:3000"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const cases = [
  { name: "desktop cached acceptance", mobile: false, choice: "accepted", yes: true },
  { name: "desktop cached refusal", mobile: false, choice: "declined", yes: false },
  { name: "mobile accepted permission", mobile: true, permission: "granted", yes: true },
  { name: "mobile declined experience", mobile: true, permission: "granted", yes: false },
  { name: "mobile denied permission", mobile: true, permission: "denied", yes: true },
  { name: "mobile permission error", mobile: true, permission: "error", yes: true },
  { name: "mobile without permission API", mobile: true, permission: "automatic", yes: true },
  { name: "mobile without sensors", mobile: true, permission: "unsupported", yes: true },
]

try {
  for (const test of cases) {
    const context = await browser.newContext({
      viewport: test.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      isMobile: test.mobile,
      hasTouch: test.mobile,
    })
    await context.addInitScript(({ choice, permission }) => {
      localStorage.setItem("nomad403:audio-gate-choice", choice ?? "accepted")
      localStorage.setItem("nomad403:sfx-muted", "0")
      localStorage.setItem("nomad403:orientation-granted", "1")
      const audit = window.__entryAudit = { requests: [], audio: [], orientationListeners: new Set() }
      const Audio = window.AudioContext
      window.AudioContext = class extends Audio {
        constructor(...args) {
          super(...args)
          audit.audio.push(this)
        }
      }
      if (permission === "unsupported") {
        Object.defineProperty(window, "DeviceOrientationEvent", { value: undefined, configurable: true })
      } else if (permission !== "automatic") {
        window.DeviceOrientationEvent.requestPermission = () => {
          audit.requests.push({ activeGesture: navigator.userActivation.isActive })
          return permission === "error"
            ? Promise.reject(new Error("Permission unavailable"))
            : Promise.resolve(permission ?? "granted")
        }
      }
      const add = window.addEventListener
      const remove = window.removeEventListener
      window.addEventListener = function (type, listener, ...args) {
        if (type === "deviceorientation") audit.orientationListeners.add(listener)
        return add.call(this, type, listener, ...args)
      }
      window.removeEventListener = function (type, listener, ...args) {
        if (type === "deviceorientation") audit.orientationListeners.delete(listener)
        return remove.call(this, type, listener, ...args)
      }
    }, test)
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto(baseUrl, { waitUntil: "networkidle" })
    const gate = page.getByRole("dialog")
    await gate.waitFor({ state: "visible" })
    const intro = gate.locator(test.mobile ? ".experience-copy-motion" : ".experience-copy-desktop")
    assert.ok(await intro.isVisible())
    if (test.mobile) assert.match(await intro.textContent(), /capteurs|sensors/)
    assert.equal(await page.locator("#webgl-canvas").count(), 0)
    await gate.locator("h2").click()
    assert.deepEqual(await page.evaluate(() => ({
      requests: window.__entryAudit.requests.length,
      audio: window.__entryAudit.audio.length,
      listeners: window.__entryAudit.orientationListeners.size,
    })), { requests: 0, audio: 0, listeners: 0 })
    await gate.getByRole("button", { name: test.yes ? /Activer l’expérience|Enable the full/ : /Continuer sans son|Continue without/ }).click()
    await gate.waitFor({ state: "hidden" })
    await page.locator('[data-ascii-renderer="gpu"]').waitFor({ state: "visible", timeout: 30000 })
    const state = await page.evaluate(() => ({
      requests: window.__entryAudit.requests,
      audioRunning: window.__entryAudit.audio.some(audio => audio.state === "running"),
      listeners: window.__entryAudit.orientationListeners.size,
      muted: localStorage.getItem("nomad403:sfx-muted"),
    }))
    const needsRequest = test.mobile && test.yes && !["automatic", "unsupported"].includes(test.permission)
    assert.equal(state.requests.length, needsRequest ? 1 : 0)
    assert.ok(state.requests.every(request => request.activeGesture))
    assert.equal(state.audioRunning, test.yes)
    assert.equal(state.muted, test.yes ? "0" : "1")
    const sensorsAllowed = test.mobile && test.yes && ["granted", "automatic"].includes(test.permission)
    assert.equal(state.listeners > 0, sensorsAllowed)
    // A background click must never trigger another system permission request.
    await page.mouse.click(5, 300)
    assert.equal(await page.evaluate(() => window.__entryAudit.requests.length), needsRequest ? 1 : 0)
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })))
    await gate.waitFor({ state: "visible" })
    await page.waitForFunction(() => localStorage.getItem("nomad403:sfx-muted") === "1" && !document.querySelector("#webgl-canvas"))
    await page.reload({ waitUntil: "networkidle" })
    await gate.waitFor({ state: "visible" })
    assert.deepEqual(errors, [])
    console.log(`PASS ${test.name}: explicit entry, gesture, sensors, cache and restoration`)
    await context.close()
  }
  const capture = await browser.newPage()
  await capture.goto(`${baseUrl}/?capture=1`, { waitUntil: "networkidle" })
  assert.equal(await capture.getByRole("dialog").count(), 0)
  await capture.locator('[data-ascii-renderer="gpu"]').waitFor({ state: "visible", timeout: 30000 })
  console.log("PASS capture mode bypass")
} finally {
  await browser.close()
}
