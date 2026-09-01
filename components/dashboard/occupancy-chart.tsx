
/*
 * "Sales Details" frame, carrying this app's data and palette:
 *   card 14px radius · shadow 6px 6px 54px rgba(0,0,0,.05) · title 24px #202224
 *   axis labels 12px rgba(43,48,52,.4) · gridlines 1px #EAEAEA
 *   line 1.5px · area gradient fading out downwards · a 2px-radius bubble on
 *   the peak · the frame's bordered selector slot
 *
 * Only the plot is drawn in SVG, stretched to the container; the axis labels,
 * points and bubble are HTML positioned over it, so nothing scales with the
 * viewBox and 12px stays 12px at every width.
 *
 * The frame's #4379EE is replaced by the brand indigo, the one colour decision
 * this app has already made. Everything else is the frame's.
 */

const GRID = [20, 40, 60, 80, 100];
const PLOT_H = 240;
const AXIS = "text-[12px] leading-[9px] text-[rgba(43,48,52,0.72)]";

/* The hover layer. The mark itself is 6px, so the group carries a padded hit
 * area — you should not have to hit the dot exactly to read its value. */
const HIT = "group absolute -translate-x-1/2 -translate-y-1/2 before:absolute before:-inset-3 before:content-['']";
const TOOLTIP =
  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-brand-ink px-2 py-1 text-[12px] leading-[16px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100";

export interface ChartPoint {
  /** X-axis tick — a time, a date. */
  label: string;
  /** Height of the point, 0–100. */
  pct: number;
  /** Spoken and shown on the peak, e.g. "2 of 2 places". */
  caption: string;
}

interface OccupancyChartProps {
  title: string;
  /** What the series covers, shown in the frame's selector slot. */
  period: string;
  points: ChartPoint[];
  /** Shown in place of the plot when there is nothing to draw. */
  emptyHint: string;
}

const atX = (i: number, count: number) => (count === 1 ? 50 : (i / (count - 1)) * 100);
const atY = (pct: number) => 100 - Math.max(0, Math.min(100, pct));

export function OccupancyChart({ title, period, points, emptyHint }: OccupancyChartProps) {
  const count = points.length;
  // Enough x labels to read the axis without them colliding.
  const step = Math.max(1, Math.ceil(count / 7));
  // The fullest day is the one worth calling out, so it carries the bubble.
  const peak = count === 0 ? -1 : points.reduce((best, p, i) => (p.pct > points[best].pct ? i : best), 0);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${atX(i, count).toFixed(2)},${atY(p.pct).toFixed(2)}`).join(" ");
  const area = count ? `${line} L100,100 L0,100 Z` : "";

  return (
    <section aria-label={title} className="rounded-2xl bg-bg-1 p-6 shadow-[6px_6px_54px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[24px] font-semibold leading-[32px] text-[#202224]">{title}</h2>
        <p className="rounded-[4px] border-[0.6px] border-[#d5d5d5] bg-[#fcfdfd] px-3 py-1.5 text-[12px] leading-[16px] text-[rgba(43,48,52,0.72)]">
          {period}
        </p>
      </div>

      {count === 0 ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">{emptyHint}</p>
      ) : (
        <>
          {/* The chart is decorative; this is the same data as text. */}
          <p className="sr-only">
            Places taken as a percentage of places offered.{" "}
            {points.map((p) => `${p.label}: ${Math.round(p.pct)} per cent, ${p.caption}.`).join(" ")}
          </p>

          <div aria-hidden="true" className="mt-10 pl-10">
            <div className="relative" style={{ height: PLOT_H }}>
              {GRID.map((value) => (
                <div key={value} className="absolute inset-x-0 border-t border-[#EAEAEA]" style={{ top: `${100 - value}%` }}>
                  <span className={`absolute -left-10 -translate-y-1/2 ${AXIS}`}>{value}%</span>
                </div>
              ))}

              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
                <defs>
                  <linearGradient id="utilisation-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#utilisation-fill)" />
                <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>

              {points.map((p, i) => (
                <span key={p.label} className={HIT} style={{ left: `${atX(i, count)}%`, top: `${atY(p.pct)}%` }}>
                  <span className={`block rounded-full bg-brand ${i === peak ? "size-2.5" : "size-1.5"}`} />
                  <span className={TOOLTIP}>
                    {p.label} · {Math.round(p.pct)}% · {p.caption}
                  </span>
                </span>
              ))}

              {peak >= 0 && (
                <span
                  className="absolute -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-[2px] bg-brand-ink px-2 py-1 text-[12px] leading-[16px] text-white"
                  style={{ left: `${atX(peak, count)}%`, top: `${atY(points[peak].pct)}%` }}
                >
                  {Math.round(points[peak].pct)}% · {points[peak].caption}
                </span>
              )}
            </div>

            <div className="relative mt-4 h-[9px]">
              {points.map((p, i) =>
                i % step === 0 || i === count - 1 ? (
                  <span
                    key={p.label}
                    className={`absolute -translate-x-1/2 whitespace-nowrap ${AXIS}`}
                    style={{ left: `${atX(i, count)}%` }}
                  >
                    {p.label}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
