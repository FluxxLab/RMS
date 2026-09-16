import { fetchRaw, readSession } from "@/lib/api";

/*
 * A study's responses, piped from the API as a CSV.
 *
 * Forwarded rather than parsed, for the same reason the audit export is: the
 * normal client validates JSON against a schema, which is the wrong shape for a
 * file. Who may take a copy is decided upstream, where the study scope lives —
 * anyone assigned to the study, and nobody else — and the API writes the export
 * to the audit log itself.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ studyId: string }> }) {
  const session = await readSession();
  if (session === null || session.role === "participant") {
    return new Response("Only research staff may export responses.", { status: 403 });
  }

  const { studyId } = await params;

  let upstream: Response;
  try {
    upstream = await fetchRaw(`/studies/${encodeURIComponent(studyId)}/responses/export`);
  } catch {
    return new Response("The research API is not responding.", { status: 502 });
  }

  if (!upstream.ok) {
    // A study outside the caller's scope comes back as a not-found upstream,
    // and is passed on as one: it is not this layer's place to explain it.
    return new Response("The export could not be produced.", { status: upstream.status });
  }

  const headers = new Headers({ "cache-control": "no-store" });
  for (const header of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(header);
    if (value !== null) headers.set(header, value);
  }

  return new Response(upstream.body, { headers });
}
