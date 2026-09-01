import { Badge, Card, CardHeader, Meter } from "@/components/fluent";
import { Checkmark, Dismiss, QuestionCircle } from "@/components/icons";
import type { RuleResult, Scorecard } from "@/lib/api/schemas";

/* The order the engine's sections read in, so the card is grouped the way the
 * screening wizard asked the questions. A section the engine names but this
 * list does not know still appears — at the end, under its own heading. */
const SECTION_ORDER = ["demographics", "physical", "health", "logistics", "bias", "history"];

const SECTION_LABEL: Record<string, string> = {
  demographics: "Demographics",
  physical: "Physical & cognitive",
  health: "Health",
  logistics: "Logistics",
  bias: "Bias prevention",
  history: "Participation history",
};

const VERDICT: Record<RuleResult["verdict"], { icon: React.ReactNode; className: string; label: string }> = {
  pass: { icon: <Checkmark size={12} strokeWidth={2.2} />, className: "bg-success-bg text-success-fg", label: "Pass" },
  fail: { icon: <Dismiss size={12} strokeWidth={2.2} />, className: "bg-danger-bg text-danger-fg", label: "Fail" },
  missing: { icon: <QuestionCircle size={14} />, className: "bg-bg-4 text-fg-3", label: "Missing" },
};

function sectionLabel(section: string): string {
  return SECTION_LABEL[section] ?? section.replace(/^\w/, (c) => c.toUpperCase());
}

function RuleRow({ rule }: { rule: RuleResult }) {
  const meta = VERDICT[rule.verdict];
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${meta.className}`} aria-hidden="true">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] leading-[22px] text-fg-1">{rule.requirement}</p>
        <p className="mt-0.5 text-[14px] leading-[17px] text-field-label">
          <span className="sr-only">{meta.label}. </span>Your answer: {rule.answer}
        </p>
        {rule.reason && <p className="mt-0.5 text-[14px] leading-[17px] text-danger-fg">{rule.reason}</p>}
      </div>
    </li>
  );
}

/**
 * Per-rule eligibility scorecard, exactly as the engine returned it. Nothing
 * here re-decides a verdict; the card groups the results and reads them out.
 */
export function ScorecardCard({ scorecard }: { scorecard: Scorecard }) {
  const total = scorecard.results.length;
  const pct = total === 0 ? 100 : (scorecard.passCount / total) * 100;

  const status = !scorecard.profileComplete
    ? { tone: "warning" as const, label: "Profile incomplete" }
    : scorecard.ok
      ? { tone: "success" as const, label: "Eligible" }
      : { tone: "danger" as const, label: "Not eligible" };

  // Sections in the wizard's order, then anything the engine named that is not in it.
  const present = [...new Set(scorecard.results.map((r) => r.section))];
  const sections = [
    ...SECTION_ORDER.filter((s) => present.includes(s)),
    ...present.filter((s) => !SECTION_ORDER.includes(s)),
  ];

  return (
    <Card padding="lg">
      <CardHeader
        size="panel"
        title="Your eligibility"
        description="Checked against the answers you gave once, at registration."
        action={
          <Badge tone={status.tone} size="sm">
            {status.label}
          </Badge>
        }
      />

      {total > 0 && (
        <div className="mt-5">
          <p className="text-[14px] leading-[17px] text-field-label">
            {scorecard.passCount} of {total} {total === 1 ? "rule" : "rules"} met
          </p>
          <Meter value={pct} label="Rules met" className="mt-2" />
        </div>
      )}

      {!scorecard.profileComplete ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">
          Complete your participant profile and this card fills in. It takes about three minutes and is done once.
        </p>
      ) : total === 0 ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">
          This study sets no eligibility rules, so there is nothing to check.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {sections.map((section) => (
            <div key={section}>
              <p className="mb-1 px-1 text-[12px] leading-[15px] text-field-label">{sectionLabel(section)}</p>
              <ul className="divide-y divide-stroke-3">
                {scorecard.results
                  .filter((r) => r.section === section)
                  .map((rule) => (
                    <RuleRow key={rule.key} rule={rule} />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
