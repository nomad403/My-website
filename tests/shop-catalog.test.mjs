import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { NAV_ITEMS, leavesPortfolioShell } from "../lib/chrome/nav-items.ts"
import {
  catalogExposesPrivateOffers,
  parseShopInterval,
  parseShopSection,
  publicShopOffers,
} from "../lib/shop/catalog.ts"
import { PLANS, publicPlans, lockPlanPrice } from "../lib/shop/plans.ts"

test("the public shop lists only the three priced offers", () => {
  const offers = publicShopOffers()
  assert.deepEqual(
    offers.map((offer) => offer.code),
    ["essential", "plus", "premium"],
  )
  assert.equal(catalogExposesPrivateOffers(), false)
  assert.equal(offers[0].monthlyAmountCents, 1900)
  assert.equal(offers[0].yearlyAmountCents, 19000)
  assert.equal(offers[1].monthlyAmountCents, 4900)
  assert.equal(offers[1].yearlyAmountCents, 49000)
  assert.equal(offers[2].monthlyAmountCents, 6900)
  assert.equal(offers[2].yearlyAmountCents, 69000)
  assert.equal(offers.every((offer) => publicPlans().some((plan) => plan.code === offer.code)), true)
})

test("shop sections and intervals fall back to the public offers view", () => {
  assert.equal(parseShopSection(null), "offers")
  assert.equal(parseShopSection("billing"), "billing")
  assert.equal(parseShopSection("friend_host"), "offers")
  assert.equal(parseShopSection("friend_care"), "offers")
  assert.equal(parseShopInterval("year"), "year")
  assert.equal(parseShopInterval("friend"), "month")
})

test("shop is a document link and the portfolio navigation still reaches expertise", () => {
  const shop = NAV_ITEMS.find((item) => item.id === "shop")
  assert.equal(shop.href, "/shop")
  assert.equal(leavesPortfolioShell("shop"), true)
  assert.equal(leavesPortfolioShell("specialist"), false)
  assert.equal(NAV_ITEMS.find((item) => item.id === "specialist").href, "/specialist")
})

test("the shop screen does not render the private offer names", () => {
  const screen = readFileSync(new URL("../components/shop/ShopExperience.tsx", import.meta.url), "utf8")
  assert.equal(screen.includes("friend_host"), false)
  assert.equal(screen.includes("friend_care"), false)
  assert.equal(screen.includes("publicShopOffers"), true)
  assert.equal(screen.includes("/api/account/checkout"), true)
  assert.equal(screen.includes("planCode: code"), true)
  assert.equal(screen.includes("/api/account/subscriptions"), true)
})

test("public cards share twelve ordered bilingual service criteria with cumulative levels", () => {
  const offers = publicShopOffers()
  const ids = [
    "hosting",
    "https",
    "monitoring",
    "protection",
    "security_review",
    "backups",
    "admin_panel",
    "content_changes",
    "activity_report",
    "priority_support",
    "personal_support",
    "major_evolution_discount",
  ]
  for (const offer of offers) {
    assert.deepEqual(offer.features.map(row => row.id), ids)
    assert.deepEqual(offer.features.map(row => row.label), offers[0].features.map(row => row.label))
    for (const row of offer.features) for (const lang of ["fr","en"]) {
      assert.ok(row.label[lang].trim())
      assert.ok(row.value[lang].trim())
      if (row.note) assert.ok(row.note[lang].trim())
    }
  }
  for (let i=0;i<ids.length;i++) {
    if (offers[0].features[i].included) assert.ok(offers[1].features[i].included)
    if (offers[1].features[i].included) assert.ok(offers[2].features[i].included)
  }
})

test("commercial copy preserves admin panel, content allowances and premium evolution discount", () => {
  const offers = publicShopOffers()
  const admin = offers.map(offer => offer.features.find(row => row.id === "admin_panel"))
  const content = offers.map(offer => offer.features.find(row => row.id === "content_changes"))
  const discount = offers.map(offer => offer.features.find(row => row.id === "major_evolution_discount"))
  assert.equal(admin[0].included, false)
  assert.equal(admin[1].included, true)
  assert.equal(admin[2].included, true)
  assert.equal(content[0].included, false)
  assert.equal(content[1].value.fr, "30 min/mois")
  assert.equal(content[1].value.en, "30 min/month")
  assert.equal(content[2].value.fr, "90 min/mois")
  assert.equal(content[2].value.en, "90 min/month")
  assert.equal(discount[0].included, false)
  assert.equal(discount[1].included, false)
  assert.equal(discount[2].value.fr, "−10 %")
  assert.equal(discount[2].value.en, "−10%")
  for (const offer of offers) for (const row of offer.features) {
    assert.equal(row.note, undefined)
  }
})

test("private prices and immutable price-lock terms remain unchanged", () => {
  assert.deepEqual(PLANS.filter(plan => plan.visibility === "private"),[
    {code:"friend_host",visibility:"private",monthlyAmountCents:1000,yearlyAmountCents:null},
    {code:"friend_care",visibility:"private",monthlyAmountCents:2000,yearlyAmountCents:null},
  ])
  assert.equal(lockPlanPrice("friend_host","year","private"),null)
  assert.equal(lockPlanPrice("friend_care","month","public"),null)
  assert.deepEqual(lockPlanPrice("premium","year","public"),{planCode:"premium",billingInterval:"year",amountCents:69000,currency:"EUR",privateOffer:false,commercialTerms:"catalog-v1"})
})
