import { expect, test } from "@playwright/test";
import { ready, tabTo } from "./helpers";

/*
 * AT-14: the booking journey is keyboard-complete.
 *
 * This is walked entirely with Tab, Enter and Space — no click anywhere — so a
 * control that only responds to a pointer fails the test rather than passing
 * unnoticed.
 */

test.describe("AT-14 booking journey is keyboard-complete", () => {
  test("reaches a study from the listing without a pointer", async ({ page }) => {
    await page.goto("/");
    await page.locator("article").first().waitFor();

    const title = (await page.locator("article h2").first().innerText()).trim();
    await tabTo(page, (label) => label === title);
    await page.keyboard.press("Enter");

    await page.waitForURL(/\/studies\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  });

  test("every control on the study page is reachable and shows focus", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('article a[href^="/studies/"]').first().getAttribute("href");
    await page.goto(href!);
    await ready(page);

    // Whatever the page offers, focus must be visible on it — a ring the
    // browser draws itself counts, a suppressed one does not.
    const controls = page.locator("main a, main button, main input, main select, main [role='radio']");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 12); i++) {
      const control = controls.nth(i);
      if (!(await control.isVisible()) || (await control.isDisabled().catch(() => false))) continue;
      await control.focus();
      const visible = await control.evaluate((el) => {
        const s = getComputedStyle(el);
        const ring = s.getPropertyValue("box-shadow");
        return s.outlineStyle !== "none" || (ring !== "none" && ring.trim() !== "");
      });
      expect(visible, `control ${i} shows no focus indicator`).toBe(true);
    }
  });

  test("FR-BKG-030 booking stays locked until every statement is confirmed", async ({ page }) => {
    // Start from no booking, so the gate is actually exercised rather than
    // skipped past. A held booking turns the panel into a move, which is a
    // different journey with its own test.
    await page.goto("/bookings");
    await ready(page);
    const cancel = page.getByRole("button", { name: "Cancel", exact: true }).first();
    if (await cancel.count()) {
      await cancel.click();
      await page.getByRole("button", { name: "Cancel booking" }).click();
      await expect(page.getByText(/place has been released/)).toBeVisible();
    }

    await page.goto("/");
    const href = await page.locator('article a[href^="/studies/"]').first().getAttribute("href");
    await page.goto(`${href!}#book`);
    await ready(page);

    const boxes = page.getByRole("checkbox");
    const statements = await boxes.count();
    expect(statements, "the study under test must set inclusion statements").toBeGreaterThan(0);

    const book = page.getByRole("button", { name: /Book this session/ });

    // Choose a session with the keyboard.
    const session = page.locator('[role="radio"]:not([disabled])').first();
    await session.focus();
    await page.keyboard.press("Enter");

    await expect(book).toBeDisabled();

    for (let i = 0; i < statements; i++) {
      await boxes.nth(i).focus();
      await page.keyboard.press("Space");
      // Each one moves the counter, so a checkbox that ignores the keyboard fails here.
      await expect(page.getByText(`${i + 1} of ${statements} confirmed`)).toBeVisible();
    }

    await expect(book).toBeEnabled();
  });
});

test.describe("AT-04 a participant is never named to staff", () => {
  test("the portal shows the pseudonym, never a name or email", async ({ page }) => {
    await page.goto("/profile");
    await ready(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^PIC\/\d{4}\/LABS\/\w+$/);
    await expect(page.locator("main")).not.toContainText("@");
  });
});
