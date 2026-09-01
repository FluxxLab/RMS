import { expect, type Page } from "@playwright/test";

export const STAFF_STATE = "e2e/.auth/staff.json";
export const PARTICIPANT_STATE = "e2e/.auth/participant.json";

/*
 * Credentials come from the environment. They are never written into the repo:
 * a seeded password in a test file is still a password in source control.
 */
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run the journey tests.`);
  return value;
}

/**
 * Waits until the page is actually styled.
 *
 * Anything judged from computed styles — contrast, target size, a focus ring —
 * is meaningless before the stylesheet lands, and would report both failures
 * that do not exist and passes that mean nothing.
 */
export async function ready(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.locator("main").waitFor();
  await page.waitForFunction(() => document.styleSheets.length > 0);
}

/** Tabs until the predicate matches, so a journey can be walked without a mouse. */
export async function tabTo(page: Page, matches: (label: string) => boolean, limit = 60): Promise<string> {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return "";
      return (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
    });
    if (matches(label)) return label;
  }
  expect(`nothing focusable matched after ${limit} tab presses`).toBe("");
  return "";
}
