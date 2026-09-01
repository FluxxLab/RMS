"use client";

import { useState, useTransition } from "react";
import { saveInterests } from "@/app/(portal)/actions";
import { Button, Card, MessageBar, TagToggle } from "@/components/fluent";
import { EmptyState } from "@/components/ui/empty-state";
import { Tag } from "@/components/icons";
import { TopicIcon } from "@/components/ui/topic-icon";

interface InterestsFormProps {
  taxonomy: string[];
  initialTags: string[];
}

export function InterestsForm({ taxonomy, initialTags }: InterestsFormProps) {
  const [selected, setSelected] = useState<string[]>(initialTags);
  const [saved, setSaved] = useState<string[]>(initialTags);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = selected.length !== saved.length || selected.some((tag) => !saved.includes(tag));

  const toggle = (tag: string) => {
    setResult(null);
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const save = () =>
    startTransition(async () => {
      const answer = await saveInterests(selected);
      setResult(answer);
      // The list only becomes the saved one once the API has taken it.
      if (answer.ok) setSaved(selected);
    });

  if (taxonomy.length === 0) {
    return (
      <Card className="py-10">
        <EmptyState
          icon={<Tag />}
          title="No topics are offered yet"
          hint="The lab publishes the list of research topics. Check back shortly, or browse the studies recruiting now."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {result && (
        <MessageBar intent={result.ok ? "success" : "error"} live>
          {result.message}
        </MessageBar>
      )}

      <Card className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 type-body-strong text-fg-1">Topics</legend>
          <p className="-mt-1 type-caption text-fg-3">
            {selected.length} of {taxonomy.length} selected. Pick everything you would consider.
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Topics">
            {taxonomy.map((tag) => (
              <TagToggle
                key={tag}
                label={tag}
                icon={<TopicIcon topic={tag} />}
                selected={selected.includes(tag)}
                onClick={() => toggle(tag)}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={save} disabled={!dirty || selected.length === 0} loading={pending}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => setSelected(saved)} disabled={!dirty || pending}>
            Discard
          </Button>
        </div>
      </Card>

      <p className="type-caption text-fg-3">
        Saving replaces your whole list. It is stored against your pseudonym only — researchers never see your name.
      </p>
    </div>
  );
}
