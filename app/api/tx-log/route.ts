import { getTxLog, readSession } from "@/lib/api";

/*
 * The polling fallback behind the live log. Same data, asked for rather than
 * pushed — used when the stream cannot be opened or has dropped (TR-012).
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (session === null || session.role === "participant") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await getTxLog();
  if (!result.ok) return Response.json({ error: "unavailable" }, { status: 502 });

  return Response.json({ entries: result.data }, { headers: { "cache-control": "no-store" } });
}
