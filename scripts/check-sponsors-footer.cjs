const { chromium } = require("playwright")
const assert = require("node:assert/strict")
;(async () => {
  const browser = await chromium.launch({ channel: "msedge" })
  try {
    for (const width of [390, 1366]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        storageState: { cookies: [], origins: [] },
      })
      const p = await context.newPage()
      const errors = []
      p.on("pageerror", (e) => errors.push(e.message))
      let sponsors = [
        {
          id: "qa-sponsor",
          name: "QA Farm Supplies",
          website: "https://example.com/farm",
          image: "",
          sector: "Agricultural suppliers",
          tagline: "For your next growing season",
          active: true,
        },
      ]
      let revision = 1
      let sponsorSaves = 0
      await context.route(
        "https://sflktwotveoltsdlkhrm.supabase.co/**",
        async (route) => {
          const url = new URL(route.request().url())
          const json = (body) =>
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(body),
            })
          if (url.pathname === "/rest/v1/bm_settings")
            return json([
              { specials: [], sponsors, sponsors_revision: revision },
            ])
          if (url.pathname === "/auth/v1/otp") return json({})
          if (url.pathname === "/auth/v1/verify")
            return json({ access_token: "test-session-only" })
          if (url.pathname === "/rest/v1/rpc/bm_is_admin") return json(true)
          if (url.pathname === "/rest/v1/rpc/bm_admin_sponsors") {
            const data = route.request().postDataJSON()
            sponsors = data.p_sponsors
            revision++
            sponsorSaves++
            return json(revision)
          }
          if (!["GET", "HEAD"].includes(route.request().method()))
            return route.abort()
          return route.continue()
        },
      )
      await p.goto(process.env.TEST_URL || "http://127.0.0.1:8443")
      await p.getByRole("button", { name: "EN", exact: true }).click()
      await p.locator(".map-sponsor-tile").waitFor()
      await p.locator("[data-stall-key]").first().waitFor()
      assert.equal(
        await p.locator(".map-sponsor-tile").getAttribute("href"),
        "https://example.com/farm",
      )
      assert.equal(
        await p.locator(".map-sponsor-tile").getAttribute("target"),
        "_blank",
      )
      const rail = await p.locator(".map-sponsor-rail").boundingBox(),
        map = await p.locator(".map-card.has-sponsor").boundingBox(),
        viewport = await p
          .locator(".map-card.has-sponsor .map-viewport")
          .boundingBox()
      assert(rail.x >= map.x && rail.x + rail.width <= viewport.x + 1)
      assert(rail.y >= map.y && rail.y + rail.height <= map.y + map.height + 1)
      assert.equal(
        await p
          .locator(".side-panel .legend-card,.side-panel .market-info-card")
          .count(),
        0,
      )
      const pill = p.locator(".floating-footer-pill")
      assert.equal(
        await pill.evaluate((e) => getComputedStyle(e).position),
        "fixed",
      )
      await pill
        .getByRole("button", { name: "Map legend", exact: true })
        .click()
      await p.waitForFunction(
        () => document.querySelector(".footer-information-dialog").open,
      )
      assert.equal(
        await p.locator(".footer-information-dialog .legend-card").count(),
        1,
      )
      await p.keyboard.press("Escape")
      assert.equal(await p.evaluate(() => document.body.style.overflow), "")
      await pill
        .getByRole("button", { name: "Market information", exact: true })
        .click()
      await p.waitForFunction(
        () => document.querySelector(".footer-information-dialog").open,
      )
      assert.equal(
        await p.locator(".footer-information-dialog .directions-link").count(),
        1,
      )
      await p.getByRole("button", { name: "Close ×", exact: true }).click()
      if (width < 901) {
        await p
          .getByRole("button", { name: "Full-screen map", exact: true })
          .click()
        assert.equal(await pill.count(), 0)
        await p.keyboard.press("Escape")
        await pill.waitFor()
      } else
        assert.equal(
          await p
            .getByRole("button", { name: "Full-screen map", exact: true })
            .isVisible(),
          false,
        )
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      await p
        .locator(".map-card.has-sponsor")
        .screenshot({ path: ".tmp-sponsor-map-" + width + ".png" })
      await p
        .getByRole("button", { name: "Administration", exact: true })
        .click()
      await p.locator("#admin-email").fill("qa@example.com")
      await p
        .getByRole("button", { name: "Send sign-in email", exact: true })
        .click()
      await p.locator("#admin-code").fill("123456")
      await p.getByRole("button", { name: "Sign in", exact: true }).click()
      await p.getByRole("button", { name: "Add sponsor", exact: true }).click()
      const row = p.locator(".sponsor-edit-row").last()
      await row.locator('[id^="sponsor-name-"]').fill("QA Outdoor Adventures")
      await row
        .locator('[id^="sponsor-website-"]')
        .fill("https://example.com/outdoor")
      await row
        .locator('[id^="sponsor-sector-"]')
        .selectOption("Caravan / outdoor businesses")
      await p
        .getByRole("button", { name: "Save sponsors", exact: true })
        .click()
      await p
        .getByRole("status")
        .filter({ hasText: "Sponsors saved and published." })
        .waitFor()
      assert.equal(sponsorSaves, 1)
      await p.getByRole("button", { name: "Public map", exact: true }).click()
      await p.locator(".map-sponsor-tile").nth(1).waitFor()
      assert.equal(await p.locator(".map-sponsor-tile").count(), 2)
      assert.equal(
        await p.locator(".map-sponsor-tile").nth(1).getAttribute("href"),
        "https://example.com/outdoor",
      )
      assert.deepEqual(errors, [])
      await context.close()
      console.log(
        "PASS " +
          width +
          "px: vertical sponsor inside map, external website, floating footer panels/keyboard, fullscreen rules, admin sponsor creation and shared display. Auth and writes mocked; no emails sent.",
      )
    }
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
