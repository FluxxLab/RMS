"use client";

import { useState, useTransition } from "react";
import { inviteMatching, screeningProgress } from "@/app/(staff)/staff/recruitment/actions";
import { Badge, Breadcrumb, Button, Field, MessageBar, PageHeader, Select } from "@/components/fluent";
import type { ScreeningProgress } from "@/lib/api/schemas";

export interface RecruitableStudy {
  id: string;
  title: string;
  irbCode: string;
  sector: string | null;
  minExperience: string | null;
}

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Recruitment" }];

const LEVELS: Record<string, string> = {
  some: "some exposure",
  working: "working knowledge",
  expert: "expert",
};

/*
 * Recruitment reads as the sequence it is.
 *
 * Everyone who matches on experience is asked; some answer; of those, the
 * study's own disqualifying answers decide. Four equal tiles would flatten that
 * into four unrelated numbers, so the stages sit on one line in order, each
 * measured against the stage before it — which is the only comparison that
 * means anything here.
 */
export function Recruitment({ studies }: { studies: RecruitableStudy[] }) {
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [progress, setProgress] = useState<ScreeningProgress | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chosen = studies.find((s) => s.id === studyId) ?? null;
  const configured = Boolean(chosen?.sector);

  const run = (action: typeof screeningProgress) => {
    if (!studyId) return;
    startTransition(async () => {
      const outcome = await action(studyId);
      if (outcome.ok) {
        setProgress(outcome.data);
        setFailure(null);
      } else {
        setProgress(null);
        setFailure(outcome.message);
      }
    });
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-8 p-6">
      <Breadcrumb items={CRUMBS} />
      <PageHeader
        title="Recruitment"
        description="Find people whose experience fits a study, then let the study's own questions decide."
      />

      {studies.length === 0 ? (
        <MessageBar intent="info" title="No studies are assigned to you.">
          Recruitment runs against a study you are named on.
        </MessageBar>
      ) : (
        <>
          {/* One row: what you are recruiting for, and the one action that starts it. */}
          <div className="flex flex-wrap items-end gap-4 border-b border-stroke-2 pb-6">
            <Field label="Study" className="min-w-[320px] flex-1">
              {({ id }) => (
                <Select
                  id={id}
                  value={studyId}
                  onChange={(e) => {
                    setStudyId(e.target.value);
                    setProgress(null);
                    setFailure(null);
                  }}
                >
                  {studies.map((study) => (
                    <option key={study.id} value={study.id}>
                      {study.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button variant="secondary" size="lg" onClick={() => run(screeningProgress)} loading={pending}>
              See progress
            </Button>
            <Button variant="primary" size="lg" onClick={() => run(inviteMatching)} loading={pending} disabled={!configured}>
              Invite matching
            </Button>
          </div>

          {/* What the study is asking for, stated plainly rather than in a banner. */}
          {chosen && (
            <p className="type-body text-fg-2">
              {configured ? (
                <>
                  Looking for {chosen.sector}
                  {chosen.minExperience ? ` at ${LEVELS[chosen.minExperience] ?? chosen.minExperience} or above` : " at any level"}.
                </>
              ) : (
                <>
                  <span className="text-danger-fg">No recruiting sector set.</span> Add a sector and a minimum
                  experience to {chosen.title} before inviting anyone.
                </>
              )}
            </p>
          )}

          {failure && (
            <MessageBar intent="error" live>
              {failure}
            </MessageBar>
          )}

          {progress && <Funnel progress={progress} />}
        </>
      )}
    </section>
  );
}

function Funnel({ progress }: { progress: ScreeningProgress }) {
  const answered = progress.passed + progress.failed;
  const stages = [
    { label: "Match on experience", value: progress.matching, of: null as number | null },
    { label: "Awaiting answers", value: progress.invited, of: progress.matching },
    { label: "Passed", value: progress.passed, of: answered },
    { label: "Screened out", value: progress.failed, of: answered },
  ];

  return (
    <section aria-label="Recruitment progress" className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-x-12 gap-y-6">
        {stages.map((stage) => (
          <li key={stage.label} className="min-w-[150px]">
            <p className="text-[32px] font-medium leading-[40px] tabular-nums text-fg-1">{stage.value}</p>
            <p className="type-body text-fg-2">{stage.label}</p>
            {/* Measured against the stage before it, which is the only comparison that means anything. */}
            <p className="type-caption text-fg-3">
              {stage.of === null
                ? "in the panel"
                : stage.of === 0
                  ? "—"
                  : `${Math.round((stage.value / stage.of) * 100)}% of ${stage.of}`}
            </p>
          </li>
        ))}
      </ol>

      {progress.recruits.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-stroke-2 pt-6">
          <h2 className="text-[16px] font-medium leading-[22px] text-fg-1">
            Ready to book ({progress.recruits.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {progress.recruits.map((pid) => (
              <li key={pid}>
                <Badge tone="brand" size="sm">
                  {pid}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress.matching === 0 && (
        <p className="type-body text-fg-2">
          Nobody on the panel has recorded experience in this sector yet.
        </p>
      )}
    </section>
  );
}
