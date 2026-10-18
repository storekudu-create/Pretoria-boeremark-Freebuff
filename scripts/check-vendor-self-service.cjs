const { chromium } = require("playwright")
const assert = require("node:assert/strict")
const fs = require("node:fs")
;(async () => {
  const { token, key } = JSON.parse(fs.readFileSync(".tmp-vendor-fixture.json"))
  const base = process.env.TEST_URL || "http://127.0.0.1:8443"
  const browser = await chromium.launch({ channel: "msedge" })
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(base + "/#vendor=" + token)
    await page.locator("#vendor-business").waitFor()
    assert(!page.url().includes(token))
    assert.equal(await page.locator("#admin-stall").count(), 0)
    assert.equal(await page.locator('input[name="number"]').count(), 0)
    await page.locator("#vendor-business").fill("Vendor QA bakery")
    await page
      .locator("#vendor-description")
      .fill("Fresh bread from our family bakery.")
    await page.locator("#vendor-whatsapp").fill("+27 82 123 4567")
    await page.locator("#vendor-website").fill("https://example.com/bakery")
    await page.locator("#vendor-products").fill("Sourdough\nRusks\nHoney")
    await page.locator("#vendor-promotion").fill("Buy two breads and save")
    await page.locator("#vendor-special").fill("Saturday bread offer")
    await page.locator("#vendor-availability").selectOption("closed")
    await page.locator(".checkbox-row input").check()
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas")
      c.width = 64
      c.height = 64
      const ctx = c.getContext("2d")
      ctx.fillStyle = "#c19245"
      ctx.fillRect(0, 0, 64, 64)
      return c.toDataURL("image/png").split(",")[1]
    })
    const file = {
      name: "qa.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    }
    for (const id of [
      "vendor-logo",
      "vendor-product-0",
      "vendor-special-photo",
    ]) {
      await page.locator("#" + id).setInputFiles(file)
      await page
        .locator("#" + id)
        .locator("..")
        .locator("img")
        .waitFor()
    }
    await page
      .getByRole("button", { name: /Stoor en publiseer|Save and publish/ })
      .click()
    await page
      .getByRole("status")
      .filter({ hasText: /Gestoor|Saved/ })
      .waitFor({ timeout: 60000 })
    assert(
      await page
        .locator("#vendor-logo")
        .locator("..")
        .locator("img")
        .getAttribute("src")
        .then((s) => s.startsWith("https://")),
    )
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({ path: ".tmp-vendor-mobile.png", fullPage: true })
    const visitor = await browser.newContext({
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    })
    const publicPage = await visitor.newPage()
    await publicPage.goto(base)
    await publicPage.getByRole("button", { name: "EN", exact: true }).click()
    await publicPage
      .locator(".advertising-premium .advertising-show-more")
      .click()
    await publicPage
      .locator('.advertising-premium [data-ad-stall-key="' + key + '"]')
      .waitFor()
    await publicPage
      .locator('.advertising-premium [data-ad-stall-key="' + key + '"]')
      .click()
    await publicPage.waitForFunction(
      () => document.querySelector("dialog").open,
    )
    assert.equal(
      await publicPage.locator("dialog .vendor-description").textContent(),
      "Fresh bread from our family bakery.",
    )
    assert.equal(
      await publicPage.locator("dialog .public-product-photos img").count(),
      1,
    )
    assert.equal(
      await publicPage.locator("dialog .vendor-website").getAttribute("href"),
      "https://example.com/bakery",
    )
    assert(
      await publicPage
        .locator("dialog")
        .innerText()
        .then(
          (t) =>
            t.includes("Buy two breads and save") &&
            t.includes("Honey") &&
            t.includes("Closed"),
        ),
    )
    await publicPage.locator(".stall-details-toolbar button").click()
    await publicPage
      .getByRole("button", { name: "Administration", exact: true })
      .click()
    await publicPage.locator("#admin-stall").waitFor()
    assert.equal(await publicPage.locator("#admin-email").count(), 0)
    const invalid = await browser.newContext()
    const invalidPage = await invalid.newPage()
    await invalidPage.goto(base + "/#vendor=" + "f".repeat(64))
    await invalidPage.getByRole("alert").waitFor()
    assert.equal(await invalidPage.locator("#vendor-business").count(), 0)
    assert.deepEqual(errors, [])
    await invalid.close()
    await visitor.close()
    await context.close()
    console.log(
      "PASS: private-link sign-in, mobile form, all fields, 3 cloud photo uploads, shared public data in separate browser, fixed stall, admin gate, invalid code and no browser errors.",
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
