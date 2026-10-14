import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import sharp from "sharp"
import jsQR from "jsqr"
import { chromium } from "playwright"

const baseUrl = process.env.AUDIT_URL ?? "http://127.0.0.1:3100"
const loadTs = async path => {
  const source = await readFile(new URL(path, import.meta.url), "utf8")
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`)
}
const { cardProfile } = await loadTs("../lib/card/profile.ts")
const { generateVCard, escapeVCardText, foldVCardLine } = await loadTs("../lib/card/vcard.ts")
const unfold = text => text.replace(/\r\n /g, "")
const vcard = generateVCard(cardProfile)
assert.ok(vcard.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"))
assert.ok(vcard.endsWith("END:VCARD\r\n"))
assert.ok(!/(?<!\r)\n|\r(?!\n)/.test(vcard))
assert.ok(vcard.includes(`N:${cardProfile.familyName};${cardProfile.givenName};;;\r\n`))
assert.ok(vcard.includes(`FN:${cardProfile.fullName}\r\n`))
assert.ok(vcard.includes(`TEL;TYPE=CELL,VOICE:${cardProfile.phone}\r\n`))
assert.ok(vcard.includes(`EMAIL;TYPE=INTERNET:${cardProfile.email}\r\n`))
assert.ok(vcard.includes(`URL:${cardProfile.website}\r\n`))
assert.equal(escapeVCardText("a\\b;c,d\r\ne"), "a\\\\b\\;c\\,d\\ne")
const longLine = `NOTE:${"é🧭;\\,".repeat(40)}`
const folded = foldVCardLine(longLine)
assert.equal(unfold(folded), longLine)
assert.ok(folded.split("\r\n").every(line => Buffer.byteLength(line) <= 75))
const escapedCard = generateVCard({ ...cardProfile, company: "A;B,C\\D\nTITLE:injection" })
assert.ok(unfold(escapedCard).includes("ORG:A\\;B\\,C\\\\D\\nTITLE:injection\r\n"))
const response = await fetch(`${baseUrl}/glenn-richard.vcf`)
assert.equal(response.status, 200)
assert.match(response.headers.get("content-type"), /^text\/vcard; charset=utf-8/i)
assert.match(response.headers.get("content-disposition"), /attachment; filename="glenn-richard.vcf"/)
assert.equal(await response.text(), vcard)
console.log("PASS vCard UTF-8, CRLF, names, fields, escaping, folding and download headers")

async function decode(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data
}
const qrResponse = await fetch(`${baseUrl}/card/qr.svg`)
assert.equal(qrResponse.status, 200)
assert.match(qrResponse.headers.get("content-type"), /^image\/svg\+xml/)
const qrSvg = await qrResponse.text()
assert.equal(await decode(await sharp(Buffer.from(qrSvg)).resize(320, 320).png().toBuffer()), cardProfile.cardUrl)
console.log("PASS QR decoded to exact NFC URL")
// Node fetch normalizes Host; use the HTTP client to exercise the domain rule.
const { request } = await import(new URL(baseUrl).protocol === "https:" ? "node:https" : "node:http")
const redirect = await new Promise((resolve, reject) => {
  const req = request(`${baseUrl}/card`, { method: "HEAD", headers: { Host: new URL(cardProfile.website).host } }, response => {
    response.resume()
    resolve({ status: response.statusCode, location: response.headers.location })
  })
  req.on("error", reject)
  req.end()
})
assert.equal(redirect.status, 308)
assert.equal(redirect.location, cardProfile.canonicalUrl)
const sitemap = await (await fetch(`${baseUrl}/sitemap-0.xml`)).text()
assert.ok(sitemap.includes(`<loc>${cardProfile.canonicalUrl}</loc>`))
assert.ok(!sitemap.includes("/card/qr.svg") && !sitemap.includes("/glenn-richard.vcf"))

const browser = await chromium.launch({ channel: "chrome", headless: true })
try {
  for (const width of [320, 375, 390, 430, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce" })
    const errors = []
    const external = []
    page.on("pageerror", error => errors.push(error.message))
    page.on("request", request => { if (!request.url().startsWith(baseUrl) && !request.url().startsWith("data:")) external.push(request.url()) })
    await page.goto(`${baseUrl}/card`, { waitUntil: "networkidle" })
    assert.equal(await page.title(), "Glenn-Richard — Nomad403")
    for (const [selector, attribute, value] of [
      ['link[rel="canonical"]', "href", cardProfile.canonicalUrl],
      ['meta[property="og:url"]', "content", cardProfile.canonicalUrl],
      ['meta[property="og:title"]', "content", "Glenn-Richard — Nomad403"],
      ['meta[name="twitter:title"]', "content", "Glenn-Richard — Nomad403"],
    ]) {
      assert.equal(await page.locator(selector).count(), 1, "metadata must be unique")
      assert.equal(await page.locator(selector).getAttribute(attribute), value)
    }
    assert.equal(await page.getByRole("dialog").count(), 0)
    assert.equal(await page.locator("canvas").count(), 0)
    assert.deepEqual(external, [])
    const bounds = await page.locator("main").evaluate(main => ({ width: main.clientWidth, content: main.scrollWidth, cursor: getComputedStyle(main).cursor }))
    assert.ok(bounds.content <= bounds.width)
    assert.equal(bounds.cursor, "auto")
    assert.equal(await page.getByRole("link", { name: /Envoyer un email/ }).getAttribute("href"), `mailto:${cardProfile.email}`)
    assert.equal(await page.getByRole("link", { name: /Appeler/ }).getAttribute("href"), `tel:${cardProfile.phone}`)
    for (const target of [page.getByRole("link", { name: /Ajouter aux contacts/ }), page.getByRole("button", { name: "Partager la carte" }), page.locator("summary")]) {
      const rect = await target.boundingBox()
      assert.ok(rect.height >= 44, "touch targets must be large enough")
    }
    await page.keyboard.press("Tab")
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "NOMAD403 — Accéder au portfolio")
    await page.locator("summary").focus()
    await page.keyboard.press("Enter")
    assert.equal(await page.locator("details").getAttribute("open"), "")
    const img = page.getByRole("img", { name: /QR code/ })
    await img.scrollIntoViewIfNeeded()
    assert.equal(await decode(await img.screenshot()), cardProfile.cardUrl)
    const downloaded = page.waitForEvent("download")
    await page.getByRole("link", { name: /Ajouter aux contacts/ }).click()
    assert.equal((await downloaded).suggestedFilename(), "glenn-richard.vcf")
    if (width === 390 || width === 768) {
      await page.locator("summary").click()
      await page.locator("main").evaluate(main => main.scrollTop = 0)
      await page.mouse.move(0, 0)
      await page.screenshot({ path: `/tmp/nomad403-card-${width}.png` })
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${width}px: responsive, metadata, no gate, keyboard, touch targets, scanned QR and vCard`)
    await page.close()
  }

  for (const mode of ["native", "clipboard", "cancel", "share-error", "manual"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.addInitScript(mode => {
      window.__cardShare = { shares: [], copies: [] }
      Object.defineProperty(navigator, "share", { configurable: true, value: mode === "clipboard" || mode === "manual" ? undefined : async payload => {
        window.__cardShare.shares.push({ payload, gesture: navigator.userActivation.isActive })
        if (mode === "cancel") throw new DOMException("Cancelled", "AbortError")
        if (mode === "share-error") throw new DOMException("Unavailable", "NotAllowedError")
      } })
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => {
        if (mode === "manual") throw new DOMException("Unavailable", "NotAllowedError")
        window.__cardShare.copies.push(value)
      } } })
    }, mode)
    await page.goto(`${baseUrl}/card`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Partager la carte" }).click()
    if (mode === "native") {
      await page.getByRole("status").filter({ hasText: "Carte partagée." }).waitFor()
      const calls = await page.evaluate(() => window.__cardShare.shares)
      assert.equal(calls[0].payload.url, cardProfile.cardUrl)
      assert.ok(calls[0].gesture)
    } else if (mode === "clipboard" || mode === "share-error") {
      await page.getByRole("status").filter({ hasText: "Lien de la carte copié." }).waitFor()
      assert.deepEqual(await page.evaluate(() => window.__cardShare.copies), [cardProfile.cardUrl])
    } else if (mode === "manual") {
      const input = page.getByRole("textbox", { name: "Lien de la carte à copier" })
      await input.waitFor()
      assert.equal(await input.inputValue(), cardProfile.cardUrl)
      assert.equal(await input.evaluate(input => input.selectionEnd - input.selectionStart), cardProfile.cardUrl.length)
    } else {
      assert.deepEqual(await page.evaluate(() => window.__cardShare.copies), [])
      assert.equal(await page.getByRole("status").textContent(), "")
    }
    console.log(`PASS share ${mode}`)
    await page.close()
  }
  for (const path of ["/", "/contact", "/projects", "/specialist"]) {
    const page = await browser.newPage()
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" })
    await page.getByRole("dialog").waitFor({ state: "visible" })
    assert.equal(await page.locator('meta[property="og:title"]').count(), 1)
    console.log(`PASS portfolio ${path}: entry gate preserved, unique metadata`)
    await page.close()
  }
} finally { await browser.close() }
