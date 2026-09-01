// Fluent avatar palette — every colour keeps ≥ 4.5:1 with white initials.
const COIN_COLOURS = [
  "#4f6bed", // cornflower
  "#0f6cbd", // blue
  "#038387", // teal
  "#5c2e91", // purple
  "#8e562e", // brown
  "#c239b3", // lilac
  "#ca5010", // pumpkin
  "#004e8c", // navy
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export function coinColour(seed: string): string {
  return COIN_COLOURS[hash(seed) % COIN_COLOURS.length];
}

/** Initials for a display name, or the last two characters of a pseudonym. */
export function initialsFor(label: string): string {
  if (label.startsWith("PIC/")) return label.slice(-2);
  const parts = label.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface PersonaProps {
  /** Display label: a staff name or a pseudonym. Never a participant name. */
  label: string;
  secondary?: string;
  size?: 24 | 32 | 40 | 48 | 64;
  /** Render only the coin. */
  coinOnly?: boolean;
  /** White ring for use on the brand bar. */
  inverse?: boolean;
  className?: string;
}

export function Persona({ label, secondary, size = 32, coinOnly = false, inverse = false, className = "" }: PersonaProps) {
  const coin = (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white ${
        inverse ? "ring-1 ring-white/80" : "ring-1 ring-black/5"
      }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundColor: inverse ? "transparent" : coinColour(label),
      }}
    >
      {initialsFor(label)}
    </span>
  );
  if (coinOnly) return <span className={className}>{coin}</span>;
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      {coin}
      <span className="min-w-0">
        <span className="block truncate type-body-strong text-fg-1">{label}</span>
        {secondary && <span className="block truncate type-caption text-fg-3">{secondary}</span>}
      </span>
    </span>
  );
}
