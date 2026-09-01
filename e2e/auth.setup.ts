import { test as setup } from "@playwright/test";
import { STAFF_STATE, PARTICIPANT_STATE, required } from "./helpers";

/*
 * Signs in once and saves each session to disk.
 *
 * Every test used to log in for itself, which put twenty sign-ins through the
 * API for one run — slow, and flaky when they queued. The journeys are about
 * what happens after signing in; signing in is proved once, here.
 */

setup("sign in as staff", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(required("BIL_STAFF_EMAIL"));
  await page.locator('input[name="password"]').fill(required("BIL_STAFF_PASSWORD"));
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/staff\//);
  await page.context().storageState({ path: STAFF_STATE });
});

setup("sign in as a participant", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(required("BIL_PARTICIPANT_EMAIL"));
  await page.getByLabel("Password").fill(required("BIL_PARTICIPANT_PASSWORD"));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/bookings/);
  await page.context().storageState({ path: PARTICIPANT_STATE });
});
