import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ready } from "./helpers";

/*
 * NFR-USE-010: WCAG 2.2 AA, zero automated violations.
 *
 * Only the levels the quality bar commits to are run. Best-practice rules are
 * advisory, and failing a build on an opinion the BRD does not hold would make
 * this suite something people learn to ignore.
 */
const LEVELS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(LEVELS).analyze();
  return violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`);
}

async function scan(page: Page, path: string) {
  await page.goto(path);
  await ready(page);
  expect(await violations(page)).toEqual([]);
}

const PUBLIC = ["/", "/sign-in", "/signup"];

const STAFF = [
  "/staff/dashboard",
  "/staff/slots",
  "/staff/bookings",
  "/staff/participants",
  "/staff/studies",
  "/staff/interests",
  "/admin",
  "/admin/studies",
  "/admin/studies/new",
  "/admin/schedules",
  "/admin/staff",
  "/admin/taxonomy",
  "/admin/audit",
];

for (const path of PUBLIC) {
  test(`NFR-USE-010 public ${path} has no accessibility violation`, async ({ page }) => {
    await scan(page, path);
  });
}

for (const path of STAFF) {
  test(`NFR-USE-010 ${path} has no accessibility violation`, async ({ page }) => {
    await scan(page, path);
  });
}
