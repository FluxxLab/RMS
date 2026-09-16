"use client";

import { useState, useTransition } from "react";
import { answerScreening } from "@/app/(portal)/screening/actions";
import { Button, Card, CardHeader, MessageBar, RadioGroup } from "@/components/fluent";
import type { PendingScreening } from "@/lib/api/schemas";

/*
 * One card per study asking to screen this participant.
 *
 * The outcome is decided the moment it is submitted, so it is shown straight
 * away rather than left to arrive by some other route. "Not this time" is said
 * plainly and without a reason: the reason is the study's rule, and reciting it
 * back only invites a second attempt with different answers.
 */
export function ScreeningForms({ screenings }: { screenings: PendingScreening[] }) {
  return (
    <div className="flex flex-col gap-6">
      {screenings.map((screening) => (
        <ScreeningForm key={screening.studyId} screening={screening} />
      ))}
    </div>
  );
}

function ScreeningForm({ screening }: { screening: PendingScreening }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unanswered = screening.questions.filter((q) => !answers[q.id]);

  const submit = () => {
    startTransition(async () => {
      const result = await answerScreening(
        screening.studyId,
        screening.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] })),
      );
      if (result.ok) {
        setOutcome(result.status);
        setFailure(null);
      } else {
        setFailure(result.message);
      }
    });
  };

  if (outcome !== null) {
    return (
      <Card>
        <CardHeader title={screening.title} />
        {outcome === "passed" ? (
          <MessageBar intent="success" title="You are a match for this study." live>
            You can book a session whenever one is open.
          </MessageBar>
        ) : (
          <MessageBar intent="info" title="Not this time." live>
            Your answers put this study outside what it is looking for. Others will come.
          </MessageBar>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={screening.title} description={screening.shortDescription} />

      <p className="type-body text-fg-2">{screening.compensation}</p>

      {screening.questions.length === 0 ? (
        <MessageBar intent="info" title="This study has no questions for you.">
          Submit to confirm your interest.
        </MessageBar>
      ) : (
        <div className="flex flex-col gap-6">
          {screening.questions.map((question) => (
            <RadioGroup
              key={question.id}
              name={`${screening.studyId}-${question.id}`}
              legend={question.prompt}
              options={question.options.map((o) => ({ value: o.id, label: o.label }))}
              value={answers[question.id] ?? ""}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
            />
          ))}
        </div>
      )}

      {failure && (
        <MessageBar intent="error" live>
          {failure}
        </MessageBar>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" onClick={submit} loading={pending} disabled={unanswered.length > 0}>
          Submit answers
        </Button>
        {unanswered.length > 0 && (
          <p className="type-caption text-fg-3">
            {unanswered.length} {unanswered.length === 1 ? "question" : "questions"} left
          </p>
        )}
      </div>
    </Card>
  );
}
