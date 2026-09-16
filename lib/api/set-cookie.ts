/*
 * Reading the session token out of a Set-Cookie header.
 *
 * This sits in its own module, free of `server-only`, so the boundary rules
 * below can be covered by a test. The parsing is the fiddly part: `fetch`
 * folds repeated Set-Cookie headers into one comma-joined string, and an
 * Expires date carries a comma of its own, so the cookie cannot simply be
 * split on commas and must be found by its name and a preceding boundary.
 */

/**
 * The value of `name` in a Set-Cookie header, or `undefined` when absent.
 *
 * `String.raw` is deliberate. In a plain template literal `\s` is not a
 * recognised escape and collapses to a bare `s`, which turns the boundary
 * class into `[,;s]`. That still reads a lone cookie, because the `^` branch
 * carries the match, and fails as soon as anything is joined ahead of it.
 */
export function readSessionToken(setCookie: string, name: string): string | undefined {
  return new RegExp(String.raw`(?:^|[,;\s])${escapeForRegExp(name)}=([^;,]+)`).exec(setCookie)?.[1];
}

/** Cookie names are a restricted token, but the name is data — treat it as such. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
