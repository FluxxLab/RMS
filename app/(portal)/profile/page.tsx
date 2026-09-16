import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Breadcrumb, MessageBar, Persona } from "@/components/fluent";
import { DataError } from "@/components/ui/data-error";
import { getMyBookings, getMyProfile, isParticipant, pageData, readSession } from "@/lib/api";
import { countryName } from "@/lib/countries";
import {
  EMPLOYMENT_LABELS,
  EXPERIENCE_LABELS,
  type EmploymentStatus,
  type ExperienceLevel,
} from "@/lib/sectors";
import { fmtDate } from "@/lib/format";
import { serverNow } from "@/lib/now";

export const metadata: Metadata = { title: "Profile · BIL Research" };

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "Profile" }];

/** Reads one answer out of the stored profile, however it was recorded. */
function read(profile: Record<string, unknown>, key: string): string | null {
  const value = profile[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    // Sector experience is a list of {sector, level}; everything else is strings.
    const experience = value.filter(
      (v): v is { sector: string; level: string } =>
        typeof v === "object" && v !== null && "sector" in v && "level" in v,
    );
    if (experience.length) {
      return experience
        .map((e) => `${e.sector} (${EXPERIENCE_LABELS[e.level as ExperienceLevel] ?? e.level})`)
        .join(", ");
    }

    const items = value.filter((v): v is string => typeof v === "string");
    return items.length ? items.join(", ") : null;
  }
  if (typeof value !== "string" || value === "") return null;
  // Country is stored as an ISO code; the participant answered with a name.
  if (key === "country") return countryName(value);
  if (key === "employmentStatus") return EMPLOYMENT_LABELS[value as EmploymentStatus] ?? value;
  return value.replace(/^\w/, (c) => c.toUpperCase());
}

/*
 * The answers, grouped as the wizard asked them. Health answers are shown to
 * the participant and to nobody else — no staff surface reads this page's
 * source, and the registry carries counts only.
 */
const GROUPS: { heading: string; rows: [string, string][] }[] = [
  {
    heading: "About you",
    rows: [
      ["Age", "age"],
      ["Gender identity", "gender"],
      ["Highest education", "education"],
      ["Country", "country"],
      ["State", "state"],
      ["Local government area", "lga"],
    ],
  },
  {
    heading: "Taking part",
    rows: [
      ["Vision and hearing", "normalVisionHearing"],
      ["Handedness", "handedness"],
      ["English fluency", "englishFluent"],
      ["Webcam and fast internet", "webcamHighSpeed"],
      ["Can travel to the lab", "canTravelToLab"],
      ["Eligible for compensation", "legalCompensationEligible"],
    ],
  },
  {
    heading: "Health",
    rows: [
      ["History of brain injury, stroke or epilepsy", "neuroHistory"],
      ["Managing a diagnosed psychological condition", "mentalHealthCondition"],
      ["Focus-altering or sedating medication", "alteringMedication"],
      ["Under-slept or used substances today", "lowSleepSubstancesToday"],
    ],
  },
  {
    heading: "Work",
    rows: [
      ["Employment status", "employmentStatus"],
      ["Sector you work in", "workSector"],
      ["Sectors you have experience in", "sectorExperience"],
    ],
  },
  {
    heading: "Background",
    rows: [
      ["Clinical healthcare role", "clinicalRole"],
      ["Mobile banking weekly", "mobileBankingWeekly"],
      ["Department affiliation", "deptAffiliation"],
      ["Psychology or neuroscience training", "psychNeuroExpertise"],
    ],
  },
];

export default async function ProfilePage() {
  const session = await readSession();
  if (!isParticipant(session)) redirect("/sign-in?next=/profile");

  const pid = session!.subject;
  const [bookingsResult, profileResult] = await Promise.all([
    getMyBookings(),
    getMyProfile(),
  ]);

  const bookings = pageData(bookingsResult, "/sign-in");
  const profile = pageData(profileResult, "/sign-in");

  if (!bookings.ok) return <DataError breadcrumb={CRUMBS} title="Profile" message={bookings.message} />;
  if (!profile.ok) return <DataError breadcrumb={CRUMBS} title="Profile" message={profile.message} />;

  const now = serverNow();
  const attended = bookings.data.filter((b) => b.status === "attended").length;
  const upcoming = bookings.data.filter((b) => b.status === "booked" && b.end > now).length;
  const missed = bookings.data.filter((b) => b.status === "no_show").length;

  const stored = profile.data.profile;
  const declared = Array.isArray(stored?.declaredConditions)
    ? (stored.declaredConditions as unknown[]).filter((c): c is string => typeof c === "string")
    : [];

  return (
    <>
      <Breadcrumb items={CRUMBS} />

      {/* Page header — sits on the canvas; the first section's rule divides it. */}
      <header className="flex flex-wrap items-center gap-6 pb-8">
        <Persona label={pid} coinOnly size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="type-title text-fg-1">{pid}</h1>
          <p className="mt-1 type-body text-fg-3">Your research records use this pseudonym, and nothing else.</p>
        </div>
        <dl className="flex gap-10">
          <div>
            <dt className="type-caption text-fg-3">Attended</dt>
            <dd className="type-title-3 text-fg-1">{attended}</dd>
          </div>
          <div>
            <dt className="type-caption text-fg-3">Upcoming</dt>
            <dd className="type-title-3 text-fg-1">{upcoming}</dd>
          </div>
          <div>
            <dt className="type-caption text-fg-3">Missed</dt>
            <dd className="type-title-3 text-fg-1">{missed}</dd>
          </div>
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section>
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="type-subtitle text-fg-1">Screening profile</h2>
            <Link href="/signup" className="rounded-xs type-body text-link hover:underline focus-ring">
              {stored ? "Update" : "Complete"}
            </Link>
          </div>

          {stored === null ? (
            <p className="type-body text-fg-2">Not completed yet. It takes about three minutes and is done once.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {!profile.data.complete && (
                <MessageBar intent="warning" title="Some answers are still missing.">
                  Studies cannot check every rule until the profile is complete, so you may not be able to book.
                </MessageBar>
              )}

              {GROUPS.map((group) => {
                const rows = group.rows
                  .map(([label, key]) => [label, read(stored, key)] as const)
                  .filter((row): row is readonly [string, string] => row[1] !== null);
                if (rows.length === 0) return null;

                return (
                  <section key={group.heading} aria-labelledby={`group-${group.heading.replace(/\s+/g, "-")}`}>
                    <h3
                      id={`group-${group.heading.replace(/\s+/g, "-")}`}
                      className="mb-2 px-1 text-[12px] leading-[15px] font-normal text-field-label"
                    >
                      {group.heading}
                    </h3>
                    <dl>
                      {rows.map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-baseline justify-between gap-6 border-b border-stroke-3 py-2.5 last:border-b-0"
                        >
                          <dt className="type-body text-fg-3">{label}</dt>
                          <dd className="type-body text-right text-fg-1">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}

              <div>
                <p className="mb-2 px-1 text-[12px] leading-[15px] text-field-label">Declared conditions</p>
                {declared.length === 0 ? (
                  <p className="type-body text-fg-3">None declared.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {declared.map((condition) => (
                      <li key={condition}>
                        <Badge tone="neutral" size="sm">
                          {condition}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="type-caption text-fg-3">
                Only you see these answers. A study sees whether its rules pass, never what you replied.
              </p>
            </div>
          )}
        </section>

        {/* Secondary: related, at a glance */}
        <aside className="flex flex-col gap-8 lg:border-l lg:border-stroke-2 lg:pl-8">

          <section>
            <h2 className="mb-3 type-body-strong text-fg-1">Your identity</h2>
            <p className="type-body text-fg-2">
              Your name and email sit in a separate vault. Staff see this pseudonym only, and health answers are used just to
              check eligibility.
            </p>
          </section>

          {bookings.data.length > 0 && (
            <section>
              <h2 className="mb-3 type-body-strong text-fg-1">Most recent session</h2>
              <p className="type-body text-fg-2">
                {bookings.data[0].title} · {fmtDate(bookings.data[0].start)}
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
