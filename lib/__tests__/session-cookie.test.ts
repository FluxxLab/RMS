import { describe, expect, it } from "vitest";

import { readSessionToken } from "@/lib/api/set-cookie";

/*
 * The token is lifted out of Set-Cookie by a regex built from a template
 * literal, which is a fragile construction: a plain template treats `\s` as an
 * unrecognised escape and collapses it to a bare `s`, quietly turning the
 * boundary class [,;\s] into [,;s]. That still reads a lone cookie, because the
 * `^` branch carries the match, and fails the moment anything is joined ahead
 * of the session cookie. These cases pin the boundary so that regression
 * cannot return unnoticed.
 */

const NAME = "jwt";

describe("readSessionToken", () => {
  it("reads the token when the session cookie stands alone", () => {
    expect(readSessionToken(`${NAME}=abc123; Path=/; HttpOnly`, NAME)).toBe("abc123");
  });

  it("reads the token when another cookie is joined ahead of it", () => {
    const header = `other=xyz; Path=/, ${NAME}=abc123; Path=/; HttpOnly`;
    expect(readSessionToken(header, NAME)).toBe("abc123");
  });

  it("reads the token past an Expires date, whose comma survives the join", () => {
    const header =
      `sid=1; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT, ` +
      `${NAME}=abc123; Path=/; HttpOnly`;
    expect(readSessionToken(header, NAME)).toBe("abc123");
  });

  it.each([";", "; ", ",", ", ", ";\t"])("accepts %j as a separator", (separator) => {
    expect(readSessionToken(`sid=1${separator}${NAME}=abc123`, NAME)).toBe("abc123");
  });

  it("stops the value at the first attribute", () => {
    expect(readSessionToken(`${NAME}=abc123; Max-Age=3600; HttpOnly`, NAME)).toBe("abc123");
  });

  it("does not mistake a cookie whose name merely ends in the session name", () => {
    expect(readSessionToken(`not${NAME}=WRONG; Path=/`, NAME)).toBeUndefined();
  });

  it("prefers the real session cookie over a lookalike sitting ahead of it", () => {
    const header = `not${NAME}=WRONG; Path=/, ${NAME}=abc123`;
    expect(readSessionToken(header, NAME)).toBe("abc123");
  });

  it("returns nothing when no session cookie is present", () => {
    expect(readSessionToken("sid=1; Path=/; HttpOnly", NAME)).toBeUndefined();
  });

  it("returns nothing for an empty header", () => {
    expect(readSessionToken("", NAME)).toBeUndefined();
  });

  it("treats a name containing regex metacharacters as a literal", () => {
    expect(readSessionToken("a.c=WRONG; Path=/", "a.c")).toBe("WRONG");
    expect(readSessionToken("abc=WRONG; Path=/", "a.c")).toBeUndefined();
  });
});
