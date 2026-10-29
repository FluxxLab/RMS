import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { allTestSteps } from "./guide-content";

/*
 * Where QA results are kept.
 *
 * A Cloudflare KV namespace, deliberately nothing to do with the research
 * databases: these are notes about the software, written by staff, and they
 * have no business sitting beside participant records. Losing them would cost
 * a test session, not an audit trail, so KV's eventual consistency is fine.
 *
 * One key per tester per step, so two people testing the same step do not
 * overwrite each other and the sheet can show both.
 */

export interface QaResult {
  testId: string;
  result: "Pass" | "Fail" | "Blocked";
  notes: string;
  tester: string;
  at: string;
}

const PREFIX = "qa:";

/** Local `next dev` has no binding; an in-memory map keeps the route working. */
const memory = new Map<string, QaResult>();

interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}

async function namespace(): Promise<KvLike | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as Record<string, unknown>).QA_RESULTS;
    return (binding as KvLike | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Tester names become part of a key, so they must not carry separators. */
function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "anonymous";
}

/** Only identifiers the plan actually contains. Keeps a public endpoint from
 *  being a free key-value store. */
const KNOWN_IDS = new Set(allTestSteps().map((step) => step.id));

export function isKnownTestId(id: string): boolean {
  return KNOWN_IDS.has(id);
}

export async function saveResult(result: QaResult): Promise<void> {
  const key = `${PREFIX}${result.testId}:${slug(result.tester)}`;
  const kv = await namespace();
  if (kv) await kv.put(key, JSON.stringify(result));
  else memory.set(key, result);
}

export async function readResults(): Promise<QaResult[]> {
  const kv = await namespace();
  if (!kv) return Array.from(memory.values());

  const found: QaResult[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: PREFIX, cursor });
    for (const entry of page.keys) {
      const raw = await kv.get(entry.name);
      if (raw) {
        try {
          found.push(JSON.parse(raw) as QaResult);
        } catch {
          /* A key that will not parse is one lost result, not a failed page. */
        }
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return found;
}

/** The whole plan joined to whatever has been recorded, in the workbook's
 *  column order so a Power Query refresh lands in the right columns. */
export function toCsv(results: QaResult[]): string {
  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = [
    "Test ID",
    "Area",
    "Page",
    "#",
    "Action",
    "Expected result",
    "Result",
    "Notes from QA",
    "Tester",
    "Date",
  ];

  const byStep = new Map<string, QaResult[]>();
  for (const result of results) {
    const list = byStep.get(result.testId) ?? [];
    list.push(result);
    byStep.set(result.testId, list);
  }

  const rows: string[] = [];
  for (const step of allTestSteps()) {
    const hits = byStep.get(step.id);
    if (!hits || hits.length === 0) {
      rows.push(
        [step.id, step.area, step.path, step.step, step.action, step.expect, "Not run", "", "", ""]
          .map(quote)
          .join(","),
      );
      continue;
    }
    // A step tested by two people produces two rows, so neither is hidden.
    for (const hit of hits) {
      rows.push(
        [
          step.id,
          step.area,
          step.path,
          step.step,
          step.action,
          step.expect,
          hit.result,
          hit.notes,
          hit.tester,
          hit.at.slice(0, 10),
        ]
          .map(quote)
          .join(","),
      );
    }
  }

  return [header.map(quote).join(","), ...rows].join("\r\n");
}
