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
        description="For the compliance pack. Both dates are inclusive; leave them empty to take everything."
      />

      {/*
        * The three controls carry a label and nothing else, so they are the same
        * height and `items-end` puts every one of them — and the button — on one
        * line. A hint under only some of them was what pushed the format field
        * and the button below the dates; "inclusive" is said once, above.
        */}
      <form action="/api/audit/export" method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <Field label="From" width="md">
          {({ id }) => <Input id={id} name="from" type="date" max={today} />}
        </Field>
        <Field label="To" width="md">
          {({ id }) => <Input id={id} name="to" type="date" max={today} />}
        </Field>
        <Field label="Format" width="md">
          {({ id }) => (
            <Select id={id} name="format" defaultValue="csv">
              <option value="csv">CSV, for a spreadsheet</option>
              <option value="json">JSON, for a system</option>
            </Select>
          )}
        </Field>
        {/* `lg` is the 52px button, matching the height of the controls it
            sits beside; the default md is 44px and reads as misaligned. */}
        <Button type="submit" variant="primary" size="lg">
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
