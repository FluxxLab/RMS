/** Alphabet excluding visually ambiguous characters (FR-IDV-020). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const PID_PATTERN = /^PIC\/\d{4}\/LABS\/[A-HJ-NP-Z2-9]{5}$/;

/**
 * Issue a pseudonym of the form PIC/YYYY/LABS/XXXXX. `random` is injected so
 * callers on the server render path stay deterministic; the real issuer is the
 * identity vault, which also guarantees uniqueness.
 */
export function issuePseudonym(year: number, random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `PIC/${year}/LABS/${code}`;
}
