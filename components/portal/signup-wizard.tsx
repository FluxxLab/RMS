"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveScreening, updateScreening } from "@/app/(portal)/actions";
import { Button, ButtonLink, Checkbox, Field, Input, MessageBar, RadioGroup, Select, Stepper, TagToggle, type Step } from "@/components/fluent";

import { COUNTRY_OPTIONS, HOME_COUNTRY, countryName } from "@/lib/countries";
import { NIGERIA_STATES, lgasOf } from "@/lib/nigeria";
import {
  EMPLOYMENT_LABELS,
  EMPLOYMENT_STATUSES,
  EXPERIENCE_HINTS,
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  SECTORS,
  worksForPay,
} from "@/lib/sectors";
import {
  CONDITIONS,
  EDUCATIONS,
  GENDERS,
  HANDEDNESS,
  MIN_PASSWORD,
  stepSchemas,
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
  /** Answers already stored, so an update starts from what is known. */
  initialAnswers?: WizardAnswers;
  initialConditions?: string[];
  initialSectorExperience?: { sector: string; level: string }[];
  /** True when a profile already exists — the wizard becomes an update. */
  editing?: boolean;
}

export function SignupWizard({
  initialAnswers = {},
  initialConditions = [],
  initialSectorExperience = [],
  editing = false,
}: SignupWizardProps) {
  // Contact details live in the vault and are never read back, so an update
  // starts past that step rather than asking for a password again.
  const [step, setStep] = useState(editing ? 1 : 0);
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers);
  const [declaredConditions, setConditions] = useState<string[]>(initialConditions);
  const [sectorExperience, setSectorExperience] = useState<{ sector: string; level: string }[]>(
    initialSectorExperience,
  );

  const experienceIn = (sector: string) => sectorExperience.find((e) => e.sector === sector)?.level;

  /* Choosing a sector opens it at the weakest level; choosing it again closes it.
     A sector with no level is not an answer, so it is removed rather than kept. */
  const toggleSector = (sector: string) =>
    setSectorExperience((prev) =>
      prev.some((e) => e.sector === sector)
        ? prev.filter((e) => e.sector !== sector)
        : [...prev, { sector, level: EXPERIENCE_LEVELS[0] }],
    );

  const setLevel = (sector: string, level: string) =>
    setSectorExperience((prev) => prev.map((e) => (e.sector === sector ? { ...e, level } : e)));
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
    setAnswers((a) => {
      const next = { ...a, [key]: value };
      // State and LGA only mean something in Nigeria, and an LGA only means
      // something inside its own state. Leaving a stale one behind would submit
      // an answer the participant never gave.
      if (key === "country" && value !== HOME_COUNTRY) {
        for (const k of ["state", "lga", "stateOfOrigin", "lgaOfOrigin", "phone", "nin", "addressLine"]) {
          delete next[k];
        }
      }
      if (key === "state") delete next.lga;
      if (key === "stateOfOrigin") delete next.lgaOfOrigin;
      if (key === "employmentStatus" && !worksForPay(value)) delete next.workSector;
      return next;
    });
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validateStep = (): boolean => {
    const schema = stepSchemas(editing)[step];
    const input: Record<string, unknown> = { ...answers, declaredConditions, sectorExperience };
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
      const payload = { ...answers, declaredConditions, sectorExperience };
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
            <Field label="Country of residence" hint="Where you currently live." error={errors.country}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="country" aria-describedby={describedBy} invalid={invalid} value={answers.country ?? ""} onChange={(e) => set("country", e.target.value)}>
                  <option value="">Choose…</option>
                  {/* The lab's own country sits first: most participants live here
                      and should not scroll the alphabet to find it. */}
                  <optgroup label="Nearby">
                    <option value={HOME_COUNTRY}>{countryName(HOME_COUNTRY)}</option>
                  </optgroup>
                  {/* The home country is offered above, so it is left out here:
                      two options carrying the same value make the control
                      display both their labels at once. */}
                  <optgroup label="All countries">
                    {COUNTRY_OPTIONS.filter((c) => c.code !== HOME_COUNTRY).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              )}
            </Field>

            {answers.country === HOME_COUNTRY && (
              <>
                <Field label="State" hint="The state you live in." error={errors.state}>
                  {({ id, describedBy, invalid }) => (
                    <Select id={id} name="state" aria-describedby={describedBy} invalid={invalid} value={answers.state ?? ""} onChange={(e) => set("state", e.target.value)}>
                      <option value="">Choose…</option>
                      {NIGERIA_STATES.map((s) => (
                        <option key={s.state} value={s.state}>
                          {s.state}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field
                  label="Local government area"
                  hint={answers.state ? "The LGA within your state." : "Choose a state first."}
                  error={errors.lga}
                >
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      name="lga"
                      aria-describedby={describedBy}
                      invalid={invalid}
                      disabled={!answers.state}
                      value={answers.lga ?? ""}
                      onChange={(e) => set("lga", e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {lgasOf(answers.state ?? "").map((lga) => (
                        <option key={lga} value={lga}>
                          {lga}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field label="State of origin" hint="The state you are from." error={errors.stateOfOrigin}>
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      name="stateOfOrigin"
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={answers.stateOfOrigin ?? ""}
                      onChange={(e) => set("stateOfOrigin", e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {NIGERIA_STATES.map((st) => (
                        <option key={st.state} value={st.state}>
                          {st.state}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field
                  label="LGA of origin"
                  hint={answers.stateOfOrigin ? "The LGA within that state." : "Choose a state of origin first."}
                  error={errors.lgaOfOrigin}
                >
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      name="lgaOfOrigin"
                      aria-describedby={describedBy}
                      invalid={invalid}
                      disabled={!answers.stateOfOrigin}
                      value={answers.lgaOfOrigin ?? ""}
                      onChange={(e) => set("lgaOfOrigin", e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {lgasOf(answers.stateOfOrigin ?? "").map((lga) => (
                        <option key={lga} value={lga}>
                          {lga}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                {/* Vault-bound, and asked only when registering: the vault is
                    written once, so an update has nowhere to put a new answer. */}
                {!editing && (
                  <>
                    <Field label="Phone number" hint="Kept in the identity vault, like your name." error={errors.phone}>
                      {({ id, describedBy, invalid }) => (
                        <Input
                          id={id}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="08012345678"
                          aria-describedby={describedBy}
                          invalid={invalid}
                          value={answers.phone ?? ""}
                          onChange={(e) => set("phone", e.target.value)}
                        />
                      )}
                    </Field>

                    <Field
                      label="National Identification Number"
                      hint="Eleven digits. Stored encrypted and never shown to researchers."
                      error={errors.nin}
                    >
                      {({ id, describedBy, invalid }) => (
                        <Input
                          id={id}
                          name="nin"
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="12345678901"
                          aria-describedby={describedBy}
                          invalid={invalid}
                          value={answers.nin ?? ""}
                          onChange={(e) => set("nin", e.target.value)}
                        />
                      )}
                    </Field>

                    <Field
                      label="Residential address"
                      hint="Street and area. Kept in the identity vault."
                      error={errors.addressLine}
                    >
                      {({ id, describedBy, invalid }) => (
                        <Input
                          id={id}
                          name="addressLine"
                          autoComplete="street-address"
                          placeholder="12 Awolowo Road, Ikoyi"
                          aria-describedby={describedBy}
                          invalid={invalid}
                          value={answers.addressLine ?? ""}
                          onChange={(e) => set("addressLine", e.target.value)}
                        />
                      )}
                    </Field>
                  </>
                )}
              </>
            )}
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
          <div className="flex flex-col gap-8">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-[16px] font-medium leading-[19px] text-fg-1">
                Sectors you have experience in
              </legend>
              <p className="-mt-1 type-body text-fg-3">
                Choose the sectors you have worked in, then say how deeply. Studies recruiting for a field
                match on this.
              </p>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((sector) => (
                  <TagToggle
                    key={sector}
                    label={sector}
                    selected={experienceIn(sector) !== undefined}
                    onClick={() => toggleSector(sector)}
                  />
                ))}
              </div>

              {/* The level is asked only for sectors actually chosen, so the step
                  stays one question until the participant makes it more. */}
              {sectorExperience.length > 0 && (
                <ul className="mt-2 flex flex-col gap-3">
                  {sectorExperience.map((entry) => (
                    <li
                      key={entry.sector}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke-2 pt-3"
                    >
                      <span className="text-[16px] leading-[22px] text-fg-1">{entry.sector}</span>
                      <span className="flex flex-wrap gap-2">
                        {EXPERIENCE_LEVELS.map((level) => (
                          <TagToggle
                            key={level}
                            label={EXPERIENCE_LABELS[level]}
                            title={EXPERIENCE_HINTS[level]}
                            selected={entry.level === level}
                            onClick={() => setLevel(entry.sector, level)}
                          />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="type-caption text-fg-3">
                {sectorExperience.length} {sectorExperience.length === 1 ? "sector" : "sectors"} recorded
              </p>
            </fieldset>

            <div className="grid gap-x-11 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              <Field label="Employment status" hint="What you are doing at the moment." error={errors.employmentStatus}>
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    name="employmentStatus"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={answers.employmentStatus ?? ""}
                    onChange={(e) => set("employmentStatus", e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {EMPLOYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {EMPLOYMENT_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              {/* Only someone who works has a sector to name. */}
              {worksForPay(answers.employmentStatus) && (
                <Field label="Sector you work in" hint="The industry of your current work." error={errors.workSector}>
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      name="workSector"
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={answers.workSector ?? ""}
                      onChange={(e) => set("workSector", e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {SECTORS.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </div>

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
