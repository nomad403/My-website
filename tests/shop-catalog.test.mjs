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
import { publicPlans } from "../lib/shop/plans.ts"

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
