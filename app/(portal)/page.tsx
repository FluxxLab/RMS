import type { Metadata } from "next";
import { Breadcrumb, ButtonLink, MessageBar, PageHeader } from "@/components/fluent";
import { StudyCard } from "@/components/portal/study-card";
import { DataError } from "@/components/ui/data-error";
import { getStudies, isParticipant, pageData, readSession } from "@/lib/api";

export const metadata: Metadata = { title: "Studies · BIL Research" };

const CRUMBS = [{ label: "Studies" }];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * The public listing. No account is needed to read it — the API serves the
 * recruiting studies to anyone, and only booking asks for a session.
 */
export default async function StudiesPage({ searchParams }: PageProps<"/">) {
  const query = first((await searchParams).q).trim().toLowerCase();
  const [result, session] = await Promise.all([getStudies().then(pageData), readSession()]);
  if (!result.ok) return <DataError breadcrumb={CRUMBS} title="Studies recruiting now" message={result.message} />;

  const signedIn = isParticipant(session);
  const visible = query
    ? result.data.filter((s) => [s.title, s.shortDescription, s.irbCode, ...s.tags].join(" ").toLowerCase().includes(query))
    : result.data;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        eyebrow="Behavioural Insights Lab"
        title="Studies recruiting now"
        description="Take part in a supervised session, see exactly who each study is for before you book, and get paid for your time."
        actions={
          signedIn ? undefined : (
            <ButtonLink href="/signup" variant="primary">
              Register to take part
            </ButtonLink>
          )
        }
      />

      {!signedIn && (
        <MessageBar intent="info" title="You are browsing as a guest.">
          Anyone can read what each study involves. Registering takes about three minutes and is what lets you book.
        </MessageBar>
      )}

      {visible.length === 0 ? (
        <MessageBar intent="info" title={query ? `No studies match “${query}”.` : "No studies are recruiting right now."}>
          {query
            ? "Try a different word, or clear the search to see every study that is recruiting."
            : "Register your research interests and we will let you know when a matching study opens."}
        </MessageBar>
      ) : (
        <ul className="flex flex-wrap gap-6">
          {visible.map((study) => (
            <li key={study.id} className="flex max-w-full">
              {/* Open-session counts need a session of their own to read, so the
                  card links through rather than promising a number it cannot check. */}
              <StudyCard study={study} openSlots={null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
