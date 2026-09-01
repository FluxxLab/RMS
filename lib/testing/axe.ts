import axeCore, { type Result } from "axe-core";

/*
 * Runs axe over a rendered fragment and returns the violations.
 *
 * It returns them rather than throwing so a failing test names what is wrong
 * on screen — "button-name", "color-contrast" — instead of just reporting that
 * a count was not zero.
 */
export async function axe(container: Element): Promise<{ id: string; help: string; nodes: number }[]> {
  const results = await axeCore.run(container, {
    // Only what the quality bar commits to. Best-practice rules are advisory
    // and would fail the build on opinions the BRD does not hold.
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    resultTypes: ["violations"],
  });

  return results.violations.map((violation: Result) => ({
    id: violation.id,
    help: violation.help,
    nodes: violation.nodes.length,
  }));
}
