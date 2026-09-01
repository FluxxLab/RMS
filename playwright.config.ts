import { defineConfig, devices } from "@playwright/test";

/*
 * Journey tests run against a real server and a real API — these are the ones
 * that prove a participant can get from the listing to a booking, and that
 * every screen is operable from the keyboard.
 *
 * The base URL is the dev server this project already runs on. Set BASE_URL to
 * point them elsewhere.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  /*
   * Generous, because these run against a dev server that compiles each route
   * the first time it is asked for. A slow first hit is the toolchain warming
   * up, not the page failing, and a tight timeout here only produces failures
   * nobody trusts.
   */
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3007",
    // A journey that fails is worth being able to watch afterwards.
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signs in once; every other project reuses the saved session.
    { name: "setup", testMatch: /auth.setup.ts/ },
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /accessibility.spec.ts/,
      grep: /public/,
    },
    {
      name: "staff",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/staff.json" },
      dependencies: ["setup"],
      testMatch: /accessibility.spec.ts/,
      grepInvert: /public/,
    },
    {
      name: "participant",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/participant.json" },
      dependencies: ["setup"],
      testMatch: /booking-journey.spec.ts/,
    },
  ],
});
