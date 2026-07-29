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

const GUESTS = [
  { name: "Ana García",  side: "Bride", phone: "+34612345678", groupId: "G1", attending: "yes",  allergies: "seafood" },
  { name: "Luis García", side: "Bride", phone: "+34612345679", groupId: "G1", attending: "no",   allergies: "" },
  { name: "Sam Smith",   side: "Groom", phone: "",             groupId: "G2", attending: null,   allergies: "" },
];

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
  await page.goto("http://localhost:8080/admin.html");
});

test("the dashboard is hidden until the server returns data", async ({ page }) => {
  await expect(page.locator("#admin-dashboard-section")).toBeHidden();
  await expect(page.locator("#admin-login-section")).toBeVisible();
});

test("the old localStorage flag no longer unlocks the dashboard", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("wedding_admin_authenticated", "true"));
  await page.reload();
  await expect(page.locator("#admin-dashboard-section")).toBeHidden();
});

test("a wrong passphrase shows an error and no data", async ({ page }) => {
  await stub(page, () => ({ ok: false, error: "unauthorized" }));

  await page.fill("#admin-password", "wrong");
  await page.click('#admin-login-form button[type="submit"]');

  await expect(page.locator("#admin-login-error")).toContainText("Incorrect");
  await expect(page.locator("#admin-dashboard-section")).toBeHidden();
  await expect(page.locator("#admin-guests-table tbody tr")).toHaveCount(0);
});

test("a throttled response is distinguished from a wrong passphrase", async ({ page }) => {
  await stub(page, () => ({ ok: false, error: "throttled", retryAfter: 900 }));

  await page.fill("#admin-password", "whatever");
  await page.click('#admin-login-form button[type="submit"]');

  await expect(page.locator("#admin-login-error")).toContainText("Too many attempts");
  await expect(page.locator("#admin-login-error")).toContainText("15");
});

test("a correct passphrase renders the summary and the responded table", async ({ page }) => {
  await stub(page, () => ({ ok: true, guests: GUESTS }));

  await page.fill("#admin-password", "right");
  await page.click('#admin-login-form button[type="submit"]');

  await expect(page.locator("#admin-dashboard-section")).toBeVisible();
  await expect(page.locator("#summary-attending")).toHaveText("1");
  await expect(page.locator("#summary-not-attending")).toHaveText("1");
  await expect(page.locator("#summary-no-response")).toHaveText("1");

  // Only Yes/No guests are listed, attending first.
  const rows = page.locator("#admin-guests-table tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Ana García");
  await expect(rows.nth(1)).toContainText("Luis García");
});

test("the passphrase survives a reload in the same session but not a new one", async ({ page, context }) => {
  await stub(page, () => ({ ok: true, guests: GUESTS }));
  await page.fill("#admin-password", "right");
  await page.click('#admin-login-form button[type="submit"]');
  await expect(page.locator("#admin-dashboard-section")).toBeVisible();

  await page.reload();
  await expect(page.locator("#admin-dashboard-section")).toBeVisible();

  const fresh = await context.newPage();
  await serveApiJs(fresh);
  await stub(fresh, () => ({ ok: true, guests: GUESTS }));
  await fresh.goto("http://localhost:8080/admin.html");
  await expect(fresh.locator("#admin-login-section")).toBeVisible();
});
