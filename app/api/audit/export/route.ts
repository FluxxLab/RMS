import { fetchRaw, readSession } from "@/lib/api";

/*
 * The audit export, piped from the API.
 *
 * A CSV comes back as an attachment, so the body and its Content-Disposition
 * are forwarded as they are rather than parsed — the normal client validates
 * JSON against a schema, which is the wrong shape for a file. The API records
 * the export in the audit log itself, which is where that belongs.
 */

export const dynamic = "force-dynamic";

/** Only these reach the API; anything else the caller appends is dropped. */
const ALLOWED = ["from", "to", "format"] as const;

export async function GET(request: Request) {
  const session = await readSession();
  // Narrower than the console: a PI may read the log, only a superadmin may
  // take a copy of it out of the system.
  if (session === null || session.role !== "super_admin") {
    return new Response("Only a superadmin may export the audit log.", { status: 403 });
  }

  const asked = new URL(request.url).searchParams;
  const query: Record<string, string> = {};
  for (const key of ALLOWED) {
    const value = asked.get(key);
    if (value !== null && value !== "") query[key] = value;
  }

  let upstream: Response;
  try {
    upstream = await fetchRaw("/audit/export", query);
  } catch {
    return new Response("The research API is not responding.", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("The export could not be produced.", { status: upstream.status });
  }

  const headers = new Headers({ "cache-control": "no-store" });
  for (const header of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(header);
    if (value !== null) headers.set(header, value);
  }

  return new Response(upstream.body, { headers });
}
