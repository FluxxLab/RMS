"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveScreening, updateScreening } from "@/app/(portal)/actions";
import { Button, ButtonLink, Checkbox, Field, Input, MessageBar, RadioGroup, Select, Stepper, TagToggle, type Step } from "@/components/fluent";

import { TopicIcon } from "@/components/ui/topic-icon";
import {
  CONDITIONS,
  EDUCATIONS,
  GENDERS,
  HANDEDNESS,
  REGIONS,
  MIN_PASSWORD,
  STEP_SCHEMAS,
  type WizardAnswers,
} from "@/lib/screening-schema";

const STEPS: Step[] = [
  { name: "Contact", description: "Name, email and password" },
  { name: "Demographics", description: "Age and background" },
  { name: "Readiness", description: "Vision and language" },
  { name: "Health", description: "Safety questions" },
  { name: "Logistics", description: "Travel and payment" },
  { name: "Bias prevention", description: "Affiliations" },
  { name: "Interests", description: "Topics you like" },
];

const LABELS = {
  gender: { female: "Female", male: "Male", nonbinary: "Non-binary", "prefer not to say": "Prefer not to say" },
  education: {
    none: "No formal qualification",
    highschool: "High school",
    somecollege: "Some college",
    bachelors: "Bachelor's degree",
    masters: "Master's degree",
    doctorate: "Doctorate",
  },
  region: { US: "United States", CA: "Canada", UK: "United Kingdom", EU: "European Union", AU: "Australia", Other: "Other" },
  handedness: { right: "Right", left: "Left", ambidextrous: "Ambidextrous" },
  condition: {
    "severe food allergy": "Severe food allergy",
    "eating disorder": "Eating disorder",
    "heart condition": "Heart condition",
    pregnancy: "Pregnancy",
    "anxiety disorder": "Anxiety disorder",
    depression: "Depression",
  },
} as const;

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

interface SignupWizardProps {
  /** The topics on offer, so the last step matches the published taxonomy. */
  taxonomy: string[];
  /** Answers already stored, so an update starts from what is known. */
  initialAnswers?: WizardAnswers;
  initialConditions?: string[];
  initialInterests?: string[];
  /** True when a profile already exists — the wizard becomes an update. */
  editing?: boolean;
}

export function SignupWizard({
  taxonomy,
  initialAnswers = {},
  initialConditions = [],
  initialInterests = [],
  editing = false,
}: SignupWizardProps) {
  // Contact details live in the vault and are never read back, so an update
  // starts past that step rather than asking for a password again.
  const [step, setStep] = useState(editing ? 1 : 0);
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers);
  const [declaredConditions, setConditions] = useState<string[]>(initialConditions);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ pid: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the step heading on every step change for screen-reader users.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const set = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validateStep = (): boolean => {
    const schema = STEP_SCHEMAS[step];
    const input: Record<string, unknown> = { ...answers, declaredConditions, interests };
    const parsed = schema.safeParse(input);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    // Focus the first invalid control.
    const first = Object.keys(next)[0];
    document.querySelector<HTMLElement>(`[name="${first}"], #${CSS.escape(first)}`)?.focus();
    return false;
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    startTransition(async () => {
      const payload = { ...answers, declaredConditions, interests };
      const r = editing ? await updateScreening(payload) : await saveScreening(payload);
      if (r.ok) setDone({ pid: r.pid });
      else setFailure(r.message);
    });
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const yesNo = (key: string, legend: string) => (
    <RadioGroup
      name={key}
      legend={legend}
      options={YES_NO}
      value={(answers[key] as "yes" | "no" | undefined) ?? ""}
      onChange={(v) => set(key, v)}
      error={errors[key]}

      inline
    />
  );

  if (done) {
    return (
      <div className="max-w-[880px] animate-rise">
        <h2 className="type-title-2 text-fg-1">{editing ? "Profile updated" : "You are registered"}</h2>
        <p className="mt-2 type-body-lg text-fg-2">
          Your pseudonym is <span className="text-fg-1">{done.pid}</span>. Everything the lab records uses it instead of your name.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <ButtonLink href="/" variant="primary">
            Browse studies
          </ButtonLink>
          <Link href="/profile" className="rounded-xs type-body text-link hover:underline focus-ring">
            View profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[797px] flex-col self-start rounded-2xl border border-panel-border bg-bg-1 px-[43px] py-[37px]">
      <div className="flex flex-col gap-6">
        <Stepper
          steps={STEPS}
          current={step}
          title={
            <h2 ref={headingRef} tabIndex={-1} className="text-[24px] leading-[29px] text-heading-ink focus:outline-none">
              {STEPS[step].name}
            </h2>
          }
        />

        <div>
        {failure && (
          <MessageBar intent="error" live>
            {failure}
          </MessageBar>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-6">
            <p className="type-body text-fg-2">
              Your name and email go to a separate identity vault. Everything after this step uses a pseudonym.
            </p>
            <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              <Field label="Full name" error={errors.fullName}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} name="fullName" autoComplete="name" aria-describedby={describedBy} invalid={invalid} value={answers.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
                )}
              </Field>
              <Field label="Email address" hint="Used only for confirmations and compensation." error={errors.email}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" aria-describedby={describedBy} invalid={invalid} value={answers.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                )}
              </Field>
              <Field
                label="Choose a password"
                hint={`At least ${MIN_PASSWORD} characters. You will use it with your email to sign in.`}
                error={errors.password}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={answers.password ?? ""}
                    onChange={(e) => set("password", e.target.value)}
                  />
                )}
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            <Field label="Age" hint="Whole years, 13 to 120." error={errors.age}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="age" type="number" inputMode="numeric" min={13} max={120} aria-describedby={describedBy} invalid={invalid} value={answers.age ?? ""} onChange={(e) => set("age", e.target.value)} />
              )}
            </Field>
            <Field label="Gender identity" error={errors.gender}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="gender" aria-describedby={describedBy} invalid={invalid} value={answers.gender ?? ""} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Choose…</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {LABELS.gender[g]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Highest education" error={errors.education}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="education" aria-describedby={describedBy} invalid={invalid} value={answers.education ?? ""} onChange={(e) => set("education", e.target.value)}>
                  <option value="">Choose…</option>
                  {EDUCATIONS.map((v) => (
                    <option key={v} value={v}>
                      {LABELS.education[v]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Region of residence" hint="Determines compensation eligibility." error={errors.region}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="region" aria-describedby={describedBy} invalid={invalid} value={answers.region ?? ""} onChange={(e) => set("region", e.target.value)}>
                  <option value="">Choose…</option>
                  {REGIONS.map((v) => (
                    <option key={v} value={v}>
                      {LABELS.region[v]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {yesNo("normalVisionHearing", "Is your vision and hearing normal, or corrected to normal?")}
            <Field label="Handedness" error={errors.handedness}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="handedness" aria-describedby={describedBy} invalid={invalid} value={answers.handedness ?? ""} onChange={(e) => set("handedness", e.target.value)}>
                  <option value="">Choose…</option>
                  {HANDEDNESS.map((v) => (
                    <option key={v} value={v}>
                      {LABELS.handedness[v]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {yesNo("englishFluent", "Are you fluent in English?")}
            {yesNo("webcamHighSpeed", "Do you have a webcam and high-speed internet for remote sessions?")}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {yesNo("neuroHistory", "Do you have a history of brain injury, stroke or epilepsy?")}
              {yesNo("mentalHealthCondition", "Are you currently managing a diagnosed psychological condition?")}
              {yesNo("alteringMedication", "Do you take medication that alters focus or causes drowsiness?")}
              {yesNo("lowSleepSubstancesToday", "Today, have you had under five hours' sleep or used recreational substances?")}
            </div>
            <fieldset>
              <legend className="px-1 text-[14px] leading-[17px] text-field-label">
                Do any of these apply to you? Leave unticked if none.
              </legend>
              <div className="mt-1 grid gap-x-6 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                {CONDITIONS.map((c) => (
                  <Checkbox
                    key={c}
                    label={LABELS.condition[c]}
                    checked={declaredConditions.includes(c)}
                    onChange={(e) => setConditions((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {yesNo("canTravelToLab", "Can you travel to the lab independently?")}
            {yesNo("legalCompensationEligible", "Are you legally eligible to receive compensation in your country?")}
            {yesNo("clinicalRole", "Do you work in a clinical healthcare role?")}
            {yesNo("mobileBankingWeekly", "Do you use a mobile-banking app at least weekly?")}
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-6">
            <p className="type-body text-fg-3">
              These protect the validity of the research. Answering yes does not affect you in any other way.
            </p>
            <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {yesNo("deptAffiliation", "Are you employed by, or studying in, this research department?")}
              {yesNo("psychNeuroExpertise", "Do you have formal training in psychology or neuroscience?")}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-3">
            <p className="type-body text-fg-3">
              Topics you would like to hear about. Change them any time.
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Research interests">
              {taxonomy.map((tag) => (
                <TagToggle
                  key={tag}
                  label={tag}
                  icon={<TopicIcon topic={tag} />}
                  selected={interests.includes(tag)}
                  onClick={() => setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                />
              ))}
            </div>
            <p className="type-caption text-fg-3">{interests.length} selected</p>
          </div>
        )}

        </div>

        <div className="flex flex-wrap gap-11">
          <Button variant="brandOutline" size="xl" onClick={back} disabled={step === (editing ? 1 : 0) || pending}>
            Back
          </Button>
          <Button variant="primary" size="xl" onClick={next} loading={pending}>
            {step < STEPS.length - 1 ? "Continue" : editing ? "Save" : "Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
