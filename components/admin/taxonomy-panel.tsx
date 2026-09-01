"use client";

import { useState } from "react";
import { addTerm, retireTerm } from "@/app/(admin)/admin/actions";
import { Badge, Button, Card, CardHeader, Dialog, Field, Input } from "@/components/fluent";
import { Add, Delete, Tag } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminAction } from "./use-admin-action";
import { AdminNotice } from "./admin-notice";

/** A term participants can register against, with how many have chosen it. */
export interface TaxonomyTerm {
  id: string;
  label: string;
  uses: number;
}

interface TaxonomyPanelProps {
  terms: TaxonomyTerm[];
}

export function TaxonomyPanel({ terms }: TaxonomyPanelProps) {
  const { notice, dismiss, pending, run } = useAdminAction();
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<TaxonomyTerm | null>(null);

  return (
    <Card padding="lg">
      <CardHeader title="Interest taxonomy" description="The terms participants can register against" />

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addTerm(draft),
            () => setDraft(""),
          );
        }}
      >
        <Field label="New term" width="md" hint="Two characters or more. Terms are unique.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. sleep and decision-making"
            />
          )}
        </Field>
        <Button type="submit" variant="primary" loading={pending} disabled={draft.trim().length < 2} icon={<Add />}>
          Add term
        </Button>
      </form>

      <div className="mt-5">
        <AdminNotice notice={notice} onDismiss={dismiss} />
      </div>

      {terms.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={<Tag />}
            title="No terms yet"
            hint="Add a term above and it becomes available in the portal's interests step."
          />
        </div>
      ) : (
        <>
          <ul className="mt-5 flex flex-wrap gap-2">
            {terms.map((term) => (
              <li key={term.id} className="flex items-center gap-1">
                <Badge tone={term.uses > 0 ? "brand" : "neutral"} size="md">
                  {term.label}
                  <span className="tabular-nums opacity-70">{term.uses}</span>
                </Badge>
                <Button
                  variant="subtle"
                  size="sm"
                  aria-label={`Retire ${term.label}`}
                  disabled={pending}
                  onClick={() => setConfirming(term)}
                  icon={<Delete />}
                />
              </li>
            ))}
          </ul>

          <Dialog
            open={confirming !== null}
            onClose={() => setConfirming(null)}
            title="Retire this term?"
            actions={
              <>
                <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending}>
                  Keep it
                </Button>
                <Button
                  variant="primary"
                  loading={pending}
                  onClick={() =>
                    confirming &&
                    run(
                      () => retireTerm(confirming.id, confirming.label),
                      () => setConfirming(null),
                    )
                  }
                >
                  Retire term
                </Button>
              </>
            }
          >
            {confirming && (
              <p>
                <span className="font-medium text-fg-1">{confirming.label}</span> will stop being offered in the portal.
                The {confirming.uses === 1 ? "lead" : "leads"} already carrying it {confirming.uses === 1 ? "keeps" : "keep"}{" "}
                it, so past submissions still read correctly. It cannot be un-retired here.
              </p>
            )}
          </Dialog>
        </>
      )}
    </Card>
  );
}
