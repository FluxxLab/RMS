import "server-only";

/**
 * The clock for one render, read on the server and passed down as a prop.
 *
 * Components never call `Date.now()`: taking the time once here is what makes
 * the server and client markup identical, and what lets a test pass its own
 * `now` instead of mocking the clock.
 */
export function serverNow(): string {
  return new Date().toISOString();
}
