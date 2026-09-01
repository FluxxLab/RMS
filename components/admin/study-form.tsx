"use client";

import { useState, useTransition } from "react";
import { createStudy, type CreateStudyResult } from "@/app/(admin)/admin/actions";
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  MessageBar,
  Select,
  TagToggle,
  Textarea,
} from "@/components/fluent";
import { Add, Dismiss } from "@/components/icons";
import { CONDITIONS, EDUCATIONS, GENDERS, HANDEDNESS, REGIONS } from "@/lib/screening-schema";

/** A researcher who can be named as responsible for a study. */
export interface Researcher {
  id: string;
  fullName: string;
}

interface StudyFormProps {
  researchers: Researcher[];
}

const LABEL = {
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

/*
 * The rules a study can set, grouped as the screening wizard asks them. A rule
 * left off is not "false" — it is a rule this study does not use, so each one
 * is only sent when it has been turned on.
 */
const REQUIREMENTS = [
  { key: "requireNormalVisionHearing", label: "Normal or corrected vision and hearing" },
  { key: "requireEnglishFluent", label: "Fluent in English" },
  { key: "requireWebcamHighSpeed", label: "Has a webcam and high-speed internet" },
  { key: "requireCanTravelToLab", label: "Can travel to the lab independently" },
  { key: "requireLegalCompensationEligible", label: "Legally eligible to receive compensation" },
  { key: "requireMobileBankingWeekly", label: "Uses mobile banking at least weekly" },
] as const;

const EXCLUSIONS = [
  { key: "excludeNeuroHistory", label: "History of brain injury, stroke or epilepsy" },
  { key: "excludeMentalHealthCondition", label: "Currently managing a diagnosed psychological condition" },
  { key: "excludeAlteringMedication", label: "Takes focus-altering or sedating medication" },
  { key: "excludeLowSleepSubstancesToday", label: "Under-slept or used substances today" },
  { key: "disallowClinicalRole", label: "Works in a clinical healthcare role" },
  { key: "excludeDeptAffiliation", label: "Employed by or studying in this department" },
  { key: "excludePsychNeuroExpertise", label: "Has formal psychology or neuroscience training" },
  { key: "excludeRecent30dParticipation", label: "Took part in a study in the last 30 days" },
] as const;

type Flag = (typeof REQUIREMENTS)[number]["key"] | (typeof EXCLUSIONS)[number]["key"];

/** Drops every key the author left blank, so an unused rule is absent, not false. */
function compact<T extends object>(source: T): Partial<T> {
  return Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function StudyForm({ researchers }: StudyFormProps) {
  const [created, setCreated] = useState<string | null>(null);
  const [result, setResult] = useState<CreateStudyResult | null>(null);
  const [pending, startTransition] = useTransition();

  // The study record.
  const [irbCode, setIrbCode] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [protocol, setProtocol] = useState("");
  const [compensation, setCompensation] = useState("");
  const [durationMinutes, setDuration] = useState("30");
  const [maxCap, setMaxCap] = useState("40");
  const [location, setLocation] = useState("");
  const [researcherId, setResearcherId] = useState(researchers[0]?.id ?? "");

  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [criterionDraft, setCriterionDraft] = useState("");

  // The rules.
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [genders, setGenders] = useState<string[]>([]);
  const [minEducation, setMinEducation] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [handedness, setHandedness] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [flags, setFlags] = useState<Set<Flag>>(new Set());
  const [cooldownDays, setCooldownDays] = useState("");
  const [maxLifetime, setMaxLifetime] = useState("");
  const [notes, setNotes] = useState("");

  const errors = result?.errors ?? {};
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const toggleFlag = (key: Flag) =>
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addTag = () => {
    const value = tagDraft.trim();
    if (value === "" || tags.includes(value)) return;
    setTags([...tags, value]);
    setTagDraft("");
  };

  const addCriterion = () => {
    const value = criterionDraft.trim();
    if (value === "" || criteria.includes(value)) return;
    setCriteria([...criteria, value]);
    setCriterionDraft("");
  };

  const submit = () => {
    const flagRules = Object.fromEntries([...flags].map((key) => [key, true]));

    const study = {
      irbCode: irbCode.trim(),
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      protocol: protocol.trim(),
      compensation: compensation.trim(),
      durationMinutes: numberOrUndefined(durationMinutes) ?? 0,
      maxCap: numberOrUndefined(maxCap) ?? 0,
      location: location.trim(),
      tags,
      inclusionCriteria: criteria,
      researcherId,
      rules: {
        ...compact({
          minAge: numberOrUndefined(minAge),
          maxAge: numberOrUndefined(maxAge),
          allowedGenders: genders.length ? genders : undefined,
          minEducation: minEducation === "" ? undefined : minEducation,
          allowedRegions: regions.length ? regions : undefined,
          requiredHandedness: handedness === "" ? undefined : handedness,
          disallowedConditions: conditions.length ? conditions : undefined,
          cooldownDays: numberOrUndefined(cooldownDays),
          maxLifetimeParticipations: numberOrUndefined(maxLifetime),
          notes: notes.trim() === "" ? undefined : notes.trim(),
        }),
        ...flagRules,
      },
    };

    startTransition(async () => {
      const answer = await createStudy(study);
      setResult(answer);
      if (answer.ok) setCreated(study.irbCode);
    });
  };

  // A study is created in draft: it is on the list, but it cannot recruit
  // until it has been through ethics review.
  if (created !== null) {
    return (
      <Card padding="lg">
        <CardHeader size="panel" title={`${created} created`} description="The study is saved, in draft" />
        <p className="mt-5 text-[16px] leading-[24px] text-fg-2">
          It is on the studies list in draft, and cannot recruit until it has been through ethics review. Move it on from
          there when it is ready.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Author another study
          </Button>
          <ButtonLink href="/admin/studies" variant="secondary">
            Back to studies
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      {result && !result.ok && (
        <MessageBar intent="error" title={result.message} live>
          {Object.keys(errors).length > 0
            ? "The fields below need attention before this study can be created."
            : "Nothing was created. Correct the problem and try again."}
        </MessageBar>
      )}

      <Card padding="lg">
        <CardHeader
          size="panel"
          title="The study"
          description="What a participant reads before deciding whether to take part"
        />
        <div className="mt-5 grid gap-x-8 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <Field label="IRB code" hint="Looks like IRB-2026-0142." error={errors.irbCode}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={irbCode}
                onChange={(e) => setIrbCode(e.target.value)}
                placeholder="IRB-2026-0142"
              />
            )}
          </Field>
          <Field label="Responsible researcher" error={errors.researcherId}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={researcherId}
                onChange={(e) => setResearcherId(e.target.value)}
              >
                {researchers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Room" error={errors.location}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Lab A1"
              />
            )}
          </Field>
          <Field label="Session length" hint="In minutes, 5 to 480." error={errors.durationMinutes}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                min={5}
                max={480}
                aria-describedby={describedBy}
                invalid={invalid}
                value={durationMinutes}
                onChange={(e) => setDuration(e.target.value)}
              />
            )}
          </Field>
          <Field label="Compensation" hint="What a participant receives." error={errors.compensation}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                placeholder="£10 voucher"
              />
            )}
          </Field>
          <Field label="Recruitment target" hint="How many participants in total." error={errors.maxCap}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                min={1}
                aria-describedby={describedBy}
                invalid={invalid}
                value={maxCap}
                onChange={(e) => setMaxCap(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <Field label="Title" error={errors.title}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Short description"
            hint="One or two sentences, shown on the study card. 20 to 400 characters."
            error={errors.shortDescription}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={400}
                aria-describedby={describedBy}
                invalid={invalid}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Protocol"
            hint="What the session actually involves. Participants read this before booking, so write it in plain language."
            error={errors.protocol}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={6}
                aria-describedby={describedBy}
                invalid={invalid}
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader
          size="panel"
          title="Topics and inclusion statements"
          description="Topics help recruitment; each statement must be confirmed before the engine takes a booking"
        />

        <div className="mt-5 flex flex-col gap-5">
          <Field label="Topic" hint="Add one at a time.">
            {({ id }) => (
              <span className="flex items-center gap-2">
                <Input
                  id={id}
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e.g. decision-making"
                />
                <Button type="button" variant="secondary" aria-label="Add topic" onClick={addTag} icon={<Add />} />
              </span>
            )}
          </Field>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag}>
                  <TagToggle label={tag} selected onClick={() => setTags(tags.filter((t) => t !== tag))} />
                </li>
              ))}
            </ul>
          )}

          <Field
            label="Inclusion statement"
            hint="At least five characters. The participant ticks each one before booking."
            error={errors["inclusionCriteria.0"]}
          >
            {({ id, describedBy, invalid }) => (
              <span className="flex items-center gap-2">
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={criterionDraft}
                  onChange={(e) => setCriterionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCriterion();
                    }
                  }}
                  placeholder="I have not taken part in this study before."
                />
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Add inclusion statement"
                  onClick={addCriterion}
                  icon={<Add />}
                />
              </span>
            )}
          </Field>

          {criteria.length > 0 && (
            <ol className="flex flex-col gap-2">
              {criteria.map((line, i) => (
                <li key={line} className="flex items-start gap-3 text-[16px] leading-[22px] text-fg-1">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[12px] leading-none tabular-nums text-brand">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{line}</span>
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    aria-label={`Remove statement ${i + 1}`}
                    onClick={() => setCriteria(criteria.filter((c) => c !== line))}
                    icon={<Dismiss />}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader
          size="panel"
          title="Eligibility rules"
          description="Leave a rule blank and this study does not use it. The engine checks every one it is given."
        />

        <div className="mt-5 grid gap-x-8 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <Field label="Youngest age" error={errors["rules.minAge"]}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                min={13}
                max={120}
                aria-describedby={describedBy}
                invalid={invalid}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
              />
            )}
          </Field>
          <Field label="Oldest age" error={errors["rules.maxAge"]}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                min={13}
                max={120}
                aria-describedby={describedBy}
                invalid={invalid}
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            )}
          </Field>
          <Field label="Lowest education">
            {({ id }) => (
              <Select id={id} value={minEducation} onChange={(e) => setMinEducation(e.target.value)}>
                <option value="">Any</option>
                {EDUCATIONS.map((value) => (
                  <option key={value} value={value}>
                    {LABEL.education[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Required handedness">
            {({ id }) => (
              <Select id={id} value={handedness} onChange={(e) => setHandedness(e.target.value)}>
                <option value="">Any</option>
                {HANDEDNESS.map((value) => (
                  <option key={value} value={value}>
                    {LABEL.handedness[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Cooldown" hint="Days before a participant may return.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                min={0}
                aria-describedby={describedBy}
                value={cooldownDays}
                onChange={(e) => setCooldownDays(e.target.value)}
              />
            )}
          </Field>
          <Field label="Lifetime cap" hint="Most times one person may take part.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                min={1}
                aria-describedby={describedBy}
                value={maxLifetime}
                onChange={(e) => setMaxLifetime(e.target.value)}
              />
            )}
          </Field>
        </div>

        <fieldset className="mt-6 flex flex-col gap-3">
          <legend className="mb-1 text-[16px] font-medium leading-[19px] text-fg-1">Gender identity</legend>
          <p className="-mt-1 text-[14px] leading-[17px] text-field-label">Leave all unticked to accept any.</p>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((value) => (
              <TagToggle
                key={value}
                label={LABEL.gender[value]}
                selected={genders.includes(value)}
                onClick={() => setGenders(toggle(genders, value))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-3">
          <legend className="mb-1 text-[16px] font-medium leading-[19px] text-fg-1">Region of residence</legend>
          <p className="-mt-1 text-[14px] leading-[17px] text-field-label">Leave all unticked to accept any.</p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((value) => (
              <TagToggle
                key={value}
                label={LABEL.region[value]}
                selected={regions.includes(value)}
                onClick={() => setRegions(toggle(regions, value))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-3">
          <legend className="mb-1 text-[16px] font-medium leading-[19px] text-fg-1">Excluded health conditions</legend>
          <p className="-mt-1 text-[14px] leading-[17px] text-field-label">
            A participant who has declared any of these is refused, for their safety.
          </p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((value) => (
              <TagToggle
                key={value}
                label={LABEL.condition[value]}
                selected={conditions.includes(value)}
                onClick={() => setConditions(toggle(conditions, value))}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid gap-x-8 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          <fieldset>
            <legend className="mb-2 text-[16px] font-medium leading-[19px] text-fg-1">A participant must</legend>
            <div className="flex flex-col">
              {REQUIREMENTS.map((rule) => (
                <Checkbox
                  key={rule.key}
                  label={rule.label}
                  checked={flags.has(rule.key)}
                  onChange={() => toggleFlag(rule.key)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[16px] font-medium leading-[19px] text-fg-1">A participant must not have</legend>
            <div className="flex flex-col">
              {EXCLUSIONS.map((rule) => (
                <Checkbox
                  key={rule.key}
                  label={rule.label}
                  checked={flags.has(rule.key)}
                  onChange={() => toggleFlag(rule.key)}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-6">
          <Field label="Notes" hint="Shown to participants alongside the rules. Up to 500 characters." error={errors["rules.notes"]}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={500}
                aria-describedby={describedBy}
                invalid={invalid}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] leading-[20px] text-field-label">
          The study is created as a draft. Move it through ethics review before it can recruit.
        </p>
        <Button type="submit" variant="primary" size="lg" loading={pending} disabled={researchers.length === 0}>
          Create study
        </Button>
      </div>
    </form>
  );
}
