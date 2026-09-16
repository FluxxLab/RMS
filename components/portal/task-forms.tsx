"use client";

import { useState, useTransition } from "react";
import { answerTask } from "@/app/(portal)/tasks/actions";
import { Button, Card, CardHeader, Field, MessageBar, RadioGroup, Textarea } from "@/components/fluent";
import type { OpenTask } from "@/lib/api/schemas";

/*
 * The study's own questions, answered during the session.
 *
 * Written once: a measurement that can be revised afterwards is not a
 * measurement, so the form is replaced by an acknowledgement on submit rather
 * than staying open for a second pass.
 */
export function TaskForms({ tasks }: { tasks: OpenTask[] }) {
  return (
    <div className="flex flex-col gap-6">
      {tasks.map((task) => (
        <TaskForm key={task.bookingId} task={task} />
      ))}
    </div>
  );
}

function TaskForm({ task }: { task: OpenTask }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unanswered = task.questions.filter((q) => !answers[q.id]?.trim());

  const submit = () => {
    startTransition(async () => {
      const result = await answerTask(
        task.bookingId,
        task.questions.map((q) =>
          q.type === "text"
            ? { questionId: q.id, text: answers[q.id] }
            : { questionId: q.id, optionId: answers[q.id] },
        ),
      );
      if (result.ok) {
        setDone(true);
        setFailure(null);
      } else {
        setFailure(result.message);
      }
    });
  };

  if (done) {
    return (
      <Card>
        <CardHeader title={task.title} />
        <MessageBar intent="success" title="Your answers are recorded." live>
          Thank you. Nothing further is needed for this session.
        </MessageBar>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={task.title} description={task.shortDescription} />

      <div className="flex flex-col gap-6">
        {task.questions.map((question) =>
          question.type === "text" ? (
            <Field key={question.id} label={question.prompt}>
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={4}
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                />
              )}
            </Field>
          ) : (
            <RadioGroup
              key={question.id}
              name={`${task.bookingId}-${question.id}`}
              legend={question.prompt}
              options={question.options.map((o) => ({ value: o.id, label: o.label }))}
              value={answers[question.id] ?? ""}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
            />
          ),
        )}
      </div>

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
