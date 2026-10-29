import { readResults, toCsv } from "@/lib/testing/qa-store";

/*
 * The test plan joined to recorded results, as CSV.
 *
 * Excel reaches this with Data → Get Data → From Web, so it must answer with
 * a content type Power Query recognises and must never be cached: a refresh
 * that returns yesterday's run is worse than no refresh at all.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const csv = toCsv(await readResults());
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "content-disposition": 'inline; filename="bil-rms-test-results.csv"',
    },
  });
}
