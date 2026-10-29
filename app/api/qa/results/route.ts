import { NextResponse } from "next/server";
import { z } from "zod";
import { isKnownTestId, readResults, saveResult } from "@/lib/testing/qa-store";

/*
 * QA results from the in-app tester guide.
 *
 * The tour runs in the browser, so anything it could present as a credential
 * would be public anyway. Rather than pretend otherwise, the endpoint accepts
 * only identifiers the published test plan contains and caps the free text —
 * which bounds the damage to overwriting a test row on a testing deployment.
 */

export const dynamic = "force-dynamic";

const Payload = z.object({
  testId: z.string().min(1).max(40),
  result: z.enum(["Pass", "Fail", "Blocked"]),
  notes: z.string().max(2000).default(""),
  tester: z.string().max(80).default(""),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That is not a result." }, { status: 422 });
  }

  if (!isKnownTestId(parsed.data.testId)) {
    return NextResponse.json({ error: "Unknown test id." }, { status: 404 });
  }

  await saveResult({ ...parsed.data, at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ results: await readResults() });
}
