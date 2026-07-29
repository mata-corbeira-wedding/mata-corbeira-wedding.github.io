import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const API = "**/macros/s/**";

// api.js ships with a REPLACE_ME placeholder and short-circuits to
// not_configured rather than calling fetch, so the endpoint stub below
// would never be reached. Serve the real file with a stand-in id so the
// shipped request logic actually runs.
//
// Uses __dirname (not import.meta.url) because this project's package.json
// has "type": "commonjs" — Playwright transpiles this spec to CJS, where
// import.meta.url is not available and __dirname is.
//
// IMPORTANT: api.js now holds a real, live production deployment URL —
// "REPLACE_ME" only remains as a substring later in the file, in the
// not-configured guard (`indexOf("REPLACE_ME")`). A naive first-match
// string replace would rewrite that guard instead of the URL, leaving the
// production URL in the script served to tests. That would only be masked
// by the fact that the `**/macros/s/**` route stub below happens to also
// match the real URL — fragile, and one route-pattern change away from
// sending test traffic (including writes) to the real guest sheet. So we
// rewrite the `API_URL` assignment itself and serve a fixed, obviously-fake
// test URL instead.
const RAW_API_JS = fs.readFileSync(path.join(__dirname, "../api.js"), "utf8");
const REAL_API_URL_MATCH = RAW_API_JS.match(/var API_URL = "([^"]*)";/);
const TEST_API_URL = "https://script.google.com/macros/s/TESTDEPLOY/exec";
const API_JS = RAW_API_JS.replace(
  /var API_URL = "[^"]*";/,
  `var API_URL = "${TEST_API_URL}";`
);

// Fail loudly rather than silently serving the real production URL to
// tests if the replacement above ever fails to take effect.
if (REAL_API_URL_MATCH && API_JS.includes(REAL_API_URL_MATCH[1])) {
  throw new Error(
    "serveApiJs: failed to strip the production API_URL from api.js before serving it to tests"
  );
}

async function serveApiJs(page) {
  await page.route("**/api.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: API_JS })
  );
}

async function stub(page, handler) {
  await page.route(API, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(await handler(body)),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await serveApiJs(page);
  await page.goto("http://localhost:8080/index.html");
});

test("a matched phone shows the group and no phone numbers", async ({ page }) => {
  await stub(page, () => ({
    ok: true,
    group: [
      { name: "Ana García", attending: "yes" },
      { name: "Luis García", attending: null },
    ],
    notes: "seafood",
  }));

  await page.click(".hero-rsvp-button");
  await page.selectOption("#rsvp-country", "+34");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-step-2")).toBeVisible();
  await expect(page.locator(".rsvp-guest-row")).toHaveCount(2);
  await expect(page.locator("#rsvp-group-list")).toContainText("Ana García");
  await expect(page.locator("#rsvp-group-list")).not.toContainText("612345678");
  await expect(page.locator("#rsvp-notes")).toHaveValue("seafood");
});

test("an unmatched phone shows the not-found message and stays on step 1", async ({ page }) => {
  await stub(page, () => ({ ok: true, group: [] }));

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "999999999");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-lookup-message")).toContainText("No guest found");
  await expect(page.locator("#rsvp-step-1")).toBeVisible();
});

test("a failed lookup shows the error message, not the not-found message", async ({ page }) => {
  // A guest whose wifi drops must not be told they are off the guest list.
  await stub(page, () => ({ ok: false, error: "network" }));

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-lookup-message")).toContainText(
    "Something went wrong. Please try again in a moment."
  );
  await expect(page.locator("#rsvp-lookup-message")).not.toContainText("No guest found");
  await expect(page.locator("#rsvp-step-1")).toBeVisible();
});

test("Back after a successful submit leaves step 2 usable for the next lookup", async ({ page }) => {
  await stub(page, (body) =>
    body.action === "lookup"
      ? { ok: true, group: [{ name: "Ana García", attending: null }], notes: "" }
      : { ok: true, written: 1 }
  );

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");
  await page.check("#rsvp-guest-0");
  await page.check('input[name="rsvp-attend-0"][value="yes"]');
  await page.click("#rsvp-submit-btn");
  await expect(page.locator("#rsvp-submit-message")).toContainText("recorded");

  await page.click("#rsvp-back-btn");
  await page.fill("#rsvp-phone", "612345679");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-step-2")).toBeVisible();
  await expect(page.locator("#rsvp-group-list")).toBeVisible();
  await expect(page.locator("#rsvp-submit-btn")).toBeVisible();
  await expect(page.locator("#rsvp-submit-btn")).toBeEnabled();
  await expect(page.locator("#rsvp-notes")).toBeVisible();
});

test("a successful submit sends indexes, not names, and reports success", async ({ page }) => {
  let submitted = null;
  await stub(page, (body) => {
    if (body.action === "lookup") {
      return { ok: true, group: [{ name: "Ana García", attending: null }], notes: "" };
    }
    submitted = body;
    return { ok: true, written: 1 };
  });

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");
  // attending is null, so the row checkbox starts unchecked and the submit
  // handler would skip it. Tick it, then choose Yes.
  await page.check("#rsvp-guest-0");
  await page.check('input[name="rsvp-attend-0"][value="yes"]');
  await page.click("#rsvp-submit-btn");

  await expect(page.locator("#rsvp-submit-message")).toContainText("recorded");
  expect(submitted.action).toBe("submit");
  expect(submitted.responses).toEqual([{ i: 0, attending: "yes" }]);
  expect(JSON.stringify(submitted)).not.toContain("Ana García");
});

test("a failed submit reports the error and re-enables the button", async ({ page }) => {
  await stub(page, (body) =>
    body.action === "lookup"
      ? { ok: true, group: [{ name: "Ana García", attending: null }], notes: "" }
      : { ok: false, error: "server_error" }
  );

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");
  await page.check("#rsvp-guest-0");
  await page.check('input[name="rsvp-attend-0"][value="yes"]');
  await page.click("#rsvp-submit-btn");

  await expect(page.locator("#rsvp-submit-message")).toContainText("went wrong");
  await expect(page.locator("#rsvp-submit-btn")).toBeEnabled();
});

test("a guest name containing markup is not rendered as HTML", async ({ page }) => {
  await stub(page, () => ({
    ok: true,
    group: [{ name: "<img src=x onerror=alert(1)>Ana", attending: null }],
    notes: "",
  }));

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-group-list img")).toHaveCount(0);
  await expect(page.locator("#rsvp-group-list")).toContainText("<img");
});
