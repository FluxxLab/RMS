import { openStream, readSession } from "@/lib/api";

/*
 * The live transaction log, piped from the API.
 *
 * This exists because the browser has no session for the API's origin — ours
 * is httpOnly on this one. The handler holds the upstream stream open and
 * forwards its bytes, so the token never leaves the server and the console
 * still gets events as they happen (TR-012).
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (session === null || session.role === "participant") {
    return new Response("Forbidden", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await openStream("/ops/tx-log/stream");
  } catch {
    return new Response("The research API is not responding.", { status: 502 });
  }

  if (!upstream.ok || upstream.body === null) {
    return new Response("The live log is unavailable.", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Proxies that buffer would defeat the point of a stream.
      "x-accel-buffering": "no",
    },
  });
}
