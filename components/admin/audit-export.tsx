"use client";

import { Button, Card, CardHeader, Field, Input, Select } from "@/components/fluent";

/**
 * Takes a copy of the audit log out of the system, for the compliance pack.
 *
 * This is a plain GET form rather than a scripted download: the browser sends
 * the dates as query parameters and saves what comes back, which keeps the
 * response streaming straight to disk and works with scripting off. It is a
 * client component only because the design system's Field takes a render prop,
 * which a server component cannot hand across the boundary.
 *
 * The API records the export in the audit log — taking a copy of the record is
 * exactly the sort of action the record exists to capture.
 */
export function AuditExport({ today }: { today: string }) {
  return (
    <Card padding="lg">
      <CardHeader
        size="panel"
        title="Export the log"
        description="For the compliance pack. Leave the dates empty to take everything."
      />

      <form action="/api/audit/export" method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <Field label="From" width="md" hint="Inclusive.">
          {({ id, describedBy }) => <Input id={id} name="from" type="date" max={today} aria-describedby={describedBy} />}
        </Field>
        <Field label="To" width="md" hint="Inclusive.">
          {({ id, describedBy }) => <Input id={id} name="to" type="date" max={today} aria-describedby={describedBy} />}
        </Field>
        <Field label="Format" width="md">
          {({ id }) => (
            <Select id={id} name="format" defaultValue="csv">
              <option value="csv">CSV, for a spreadsheet</option>
              <option value="json">JSON, for a system</option>
            </Select>
          )}
        </Field>
        <Button type="submit" variant="primary">
          Export
        </Button>
      </form>

      <p className="mt-4 text-[14px] leading-[20px] text-field-label">
        A partial export is worse than none, because it looks complete — so a date range returns everything within it, not a
        page of it. The export itself is written to the log.
      </p>
    </Card>
  );
}
