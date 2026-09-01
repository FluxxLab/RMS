/*
 * "Sales Details" card frame carrying a donut: 14px radius · shadow
 * 6px 6px 54px rgba(0,0,0,.05) · title 24px #202224 · the bordered selector
 * slot · 12px rgba(43,48,52,.4) supporting text.
 *
 * A thin ring on a tinted track, its segments separated by a small gap and
 * marked with a dot, with the figures read underneath. Segments are ranked
 * largest first and take the series ramp in that order, so the ramp reads as
 * the ranking; every segment is also named and numbered below, so nothing has
 * to be decoded from the colour.
 */

const RAMP = ["bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4", "bg-series-5"];
const STROKE = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
  "var(--color-series-4)",
  "var(--color-series-5)",
];

/* The hover layer, matching the line chart's. */
const HIT = "group absolute -translate-x-1/2 -translate-y-1/2 before:absolute before:-inset-3 before:content-['']";
const TOOLTIP =
  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-brand-ink px-2 py-1 text-[12px] leading-[16px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100";

const R = 70;
const C = 100;
const WIDTH = 14;
const CIRCUMFERENCE = 2 * Math.PI * R;
/** Track showing between segments, in user units. */
const GAP = 6;

export interface Slice {
  label: string;
  value: number;
}

interface ShareChartProps {
  title: string;
  /** What the breakdown covers, shown in the frame's selector slot. */
  period: string;
  /** The unit being divided up, e.g. "bookings". */
  unit: string;
  slices: Slice[];
  emptyHint: string;
}

export function ShareChart({ title, period, unit, slices, emptyHint }: ShareChartProps) {
  const ranked = [...slices].sort((a, b) => b.value - a.value);
  const total = ranked.reduce((sum, s) => sum + s.value, 0);

  // Each segment starts where the previous one ended.
  const segments = ranked.reduce<(Slice & { fraction: number; start: number; end: number })[]>((acc, slice) => {
    const start = acc.length === 0 ? 0 : acc[acc.length - 1].end;
    const fraction = slice.value / Math.max(1, total);
    return [...acc, { ...slice, fraction, start, end: start + fraction }];
  }, []);

  const dotAt = (fraction: number) => {
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    return { cx: C + R * Math.cos(angle), cy: C + R * Math.sin(angle) };
  };

  return (
    <section aria-label={title} className="rounded-2xl bg-bg-1 p-6 shadow-[6px_6px_54px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[24px] font-semibold leading-[32px] text-[#202224]">{title}</h2>
        <p className="rounded-[4px] border-[0.6px] border-[#d5d5d5] bg-[#fcfdfd] px-3 py-1.5 text-[12px] leading-[16px] text-[rgba(43,48,52,0.72)]">
          {period}
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">{emptyHint}</p>
      ) : (
        <>
          <p className="sr-only">
            {total} {unit} in total.{" "}
            {segments.map((s) => `${s.label}: ${s.value}, ${Math.round(s.fraction * 100)} per cent.`).join(" ")}
          </p>

          <div className="mt-8 flex flex-col items-center gap-8">
            <div aria-hidden="true" className="relative size-[200px] shrink-0">
              <svg viewBox="0 0 200 200" className="size-full -rotate-90">
                <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-brand-tint-2)" strokeWidth={WIDTH} />
                {segments.map((s, i) => {
                  const length = Math.max(0, s.fraction * CIRCUMFERENCE - GAP);
                  if (length === 0) return null;
                  return (
                    <circle
                      key={s.label}
                      cx={C}
                      cy={C}
                      r={R}
                      fill="none"
                      stroke={STROKE[i % STROKE.length]}
                      strokeWidth={WIDTH}
                      strokeLinecap="round"
                      strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                      strokeDashoffset={-(s.start * CIRCUMFERENCE) - GAP / 2}
                    />
                  );
                })}
              </svg>

              {segments.map((s, i) => {
                if (s.fraction === 0) return null;
                const { cx, cy } = dotAt((s.start + s.end) / 2);
                return (
                  <span
                    key={`${s.label}-dot`}
                    className={HIT}
                    style={{ left: `${(cx / 200) * 100}%`, top: `${(cy / 200) * 100}%` }}
                  >
                    <span className={`block size-2.5 rounded-full ring-2 ring-bg-1 ${RAMP[i % RAMP.length]}`} />
                    <span className={TOOLTIP}>
                      {s.label} · {s.value} {unit} · {Math.round(s.fraction * 100)}%
                    </span>
                  </span>
                );
              })}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[28px] font-semibold leading-[32px] tabular-nums text-[#202224]">{total}</span>
                <span className="text-[12px] leading-[16px] text-[rgba(43,48,52,0.72)]">{unit}</span>
              </div>
            </div>

            <ul className="flex w-full flex-col gap-3">
              {segments.map((s, i) => (
                <li key={s.label} className="flex items-baseline gap-3">
                  <span aria-hidden="true" className={`size-2.5 shrink-0 translate-y-px rounded-full ${RAMP[i % RAMP.length]}`} />
                  <span className="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-fg-1">{s.label}</span>
                  <span className="shrink-0 tabular-nums text-[14px] leading-[20px] text-field-label">
                    {s.value} · {Math.round(s.fraction * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
