/*
 * Finding the element a tour step points at.
 *
 * Nothing in the app carries a test id, and adding one to every button a
 * tester should look at would mean editing dozens of components for the sake
 * of a temporary aid. The e2e suite already selects by role and accessible
 * name, `getByRole("button", { name: "Sign in" })`, so the tour does the
 * same. If the button's label changes, both break together, which is the
 * right coupling: a renamed control is a changed instruction.
 */

export type TourTarget =
  | { kind: "role"; role: TargetRole; name: string | RegExp }
  | { kind: "label"; text: string }
  | { kind: "text"; text: string | RegExp }
  | { kind: "css"; selector: string };

type TargetRole = "button" | "link" | "textbox" | "heading" | "checkbox";

/* A pragmatic role map rather than full ARIA resolution: enough to reach the
   controls a tester is told to click, without a dependency. */
const ROLE_SELECTORS: Record<TargetRole, string> = {
  button: 'button, [role="button"], input[type="submit"], input[type="button"]',
  link: 'a[href], [role="link"]',
  textbox: 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [role="textbox"]',
  heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"]',
};

function visible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/**
 * The name a screen reader would announce, near enough for matching: an
 * explicit label wins, then an associated <label>, then the text inside.
 */
function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }

  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) return label.textContent.trim();
  }

  const placeholder = el.getAttribute("placeholder");
  return (el.textContent ?? placeholder ?? "").trim();
}

function matches(name: string, wanted: string | RegExp): boolean {
  return typeof wanted === "string"
    ? name.toLowerCase() === wanted.toLowerCase() || name.toLowerCase().includes(wanted.toLowerCase())
    : wanted.test(name);
}

/** The smallest visible element matching, or null. Never throws. */
export function findTarget(target: TourTarget): HTMLElement | null {
  try {
    if (target.kind === "css") {
      const el = document.querySelector(target.selector);
      return el instanceof HTMLElement && visible(el) ? el : null;
    }

    if (target.kind === "text") {
      /* Deepest match wins: pointing at <body> because it contains the words
         would spotlight the whole page. */
      const all = Array.from(document.querySelectorAll("button, a, h1, h2, h3, label, li, td, th, p, span, div"));
      const hits = all.filter(
        (el) => el instanceof HTMLElement && visible(el) && matches((el.textContent ?? "").trim(), target.text),
      );
      return (hits[hits.length - 1] as HTMLElement) ?? null;
    }

    const selector = target.kind === "label" ? ROLE_SELECTORS.textbox : ROLE_SELECTORS[target.role];
    const wanted = target.kind === "label" ? target.text : target.name;

    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (el instanceof HTMLElement && visible(el) && matches(accessibleName(el), wanted)) return el;
    }
    return null;
  } catch {
    // A malformed selector should quietly cost one spotlight, not the tour.
    return null;
  }
}
