import { ChevronDown } from "@/components/icons";

/*
 * "Payment" frame: shadow 0 0 4px rgba(0,0,0,.15) · eyebrow 18/22 #89868D · title 22.78/27 #3A3541 · a text-and-chevron
 * control at the top right · a 1px #DBDCDE divider under the header · dashed
 * 1.5px #DBDCDE gridlines with their value at the left · a solid rule on the
 * baseline · 10px #3A3541 labels at each end · stacked bars ~38px wide with a
 * lighter cap.
 *
 * The frame's #6E39CB / #D3BBFE become the series ramp — this app's palette is
 * indigo — its 700 title weight becomes 500, the app-wide ceiling, and its 8px
 * radius and 30px inset become the shared surface radius and 24px inset.
 */

/* The hover layer. The bar is the mark, so the whole column is the hit area. */
const TOOLTIP =
  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-brand-ink px-2 py-1 text-[12px] leading-[16px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100";

const BAR_W = 38;
const PLOT_H = 210;

export interface StackSeries {
  key: string;
  label: string;
  /** Token-backed fill. */
  fill: string;
}

export interface StackBar {
  /** X-axis label. Only the first and last are drawn, as in the frame. */
  label: string;
  values: Record<string, number>;
}

interface StackedBarChartProps {
  eyebrow: string;
  title: string;
  /** The control at the top right — a period, a scope. */
  control: string;
  series: StackSeries[];
  bars: StackBar[];
  emptyHint: string;
}

/** Ticks the gridlines sit on: a rounded top, and even steps below it. */
function ticks(max: number): number[] {
  const top = Math.max(1, Math.ceil(max));
  const step = Math.max(1, Math.ceil(top / 4));
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

export function StackedBarChart({ eyebrow, title, control, series, bars, emptyHint }: StackedBarChartProps) {
  const totals = bars.map((b) => series.reduce((sum, s) => sum + (b.values[s.key] ?? 0), 0));
  const scale = ticks(Math.max(0, ...totals));
  const top = scale[scale.length - 1];

  return (
    <section aria-label={title} className="rounded-2xl bg-bg-1 p-6 shadow-[0_0_4px_rgba(0,0,0,0.15)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[18px] leading-[22px] text-[#89868D]">{eyebrow}</p>
          <h2 className="mt-1 text-[22.78px] font-semibold leading-[27px] text-[#3A3541]">{title}</h2>
        </div>
        <p className="flex items-center gap-2.5 px-4 py-[5px] text-[14.22px] leading-[17px] text-[#89868D]">
          {control}
          <ChevronDown size={16} className="text-[#89868D]" />
        </p>
      </div>

      <div className="mt-6 border-t border-[#DBDCDE]" />

      {bars.length === 0 ? (
        <p className="mt-6 text-[16px] leading-[22px] text-fg-2">{emptyHint}</p>
      ) : (
        <>
          <p className="sr-only">
            {bars
              .map((b, i) => `${b.label}: ${totals[i]} calls, ${series.map((s) => `${b.values[s.key] ?? 0} ${s.label}`).join(", ")}.`)
              .join(" ")}
          </p>

          <div aria-hidden="true" className="mt-8 pl-8">
            <div className="relative" style={{ height: PLOT_H }}>
              {scale.map((value) => (
                <div
                  key={value}
                  className={`absolute inset-x-0 border-t ${value === 0 ? "border-[1.5px] border-[#DBDCDE]" : "border-[1.5px] border-dashed border-[#DBDCDE]"}`}
                  style={{ top: `${100 - (value / top) * 100}%` }}
                >
                  <span className="absolute -left-8 -translate-y-1/2 text-[14.22px] leading-[17px] text-[#3A3541]">{value}</span>
                </div>
              ))}

              <div className="absolute inset-0 flex items-end justify-between">
                {bars.map((bar, i) => (
                  <div
                    key={bar.label}
                    className="group relative flex flex-col justify-end"
                    style={{ width: BAR_W, height: `${(totals[i] / top) * 100}%` }}
                  >
                    <span className={TOOLTIP}>
                      {bar.label} · {totals[i]} · {series.map((s) => `${bar.values[s.key] ?? 0} ${s.label.toLowerCase()}`).join(", ")}
                    </span>
                    {series.map((s, si) => {
                      const value = bar.values[s.key] ?? 0;
                      if (value <= 0) return null;
                      return (
                        <span
                          key={s.key}
                          className={`w-full ${s.fill} ${si === 0 ? "rounded-t-[4px]" : ""}`}
                          style={{ height: `${(value / Math.max(1, totals[i])) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 flex justify-between text-[10px] leading-[12px] text-[#3A3541]">
              <span>{bars[0].label}</span>
              {bars.length > 1 && <span>{bars[bars.length - 1].label}</span>}
            </div>
          </div>

          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-[14.22px] leading-[17px] text-[#89868D]">
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${s.fill}`} />
                {s.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
