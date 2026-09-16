// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PageScroller } from "./page-scroller";

/*
 * Who owns focus when a page arrives.
 *
 * The console's frame is a fixed-height column, so `<body>` does not scroll and
 * `<main>` does. A browser sends Arrow, Page Up/Down, Home and End to the
 * nearest scrollable ancestor of the focused element, so if focus is anywhere
 * but inside the view, those keys move nothing. jsdom does not scroll, but the
 * decision about where focus lands is the whole mechanism — and it is the part
 * with rules worth pinning down.
 */

const pathname = vi.fn(() => "/admin");
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

beforeEach(() => {
  pathname.mockReturnValue("/admin");
  document.body.innerHTML = "";
});

describe("on arrival", () => {
  it("takes focus, so the keyboard can scroll without a click first", () => {
    render(
      <PageScroller>
        <p>Overview</p>
      </PageScroller>,
    );

    expect(document.activeElement?.tagName).toBe("MAIN");
  });

  it("leaves an autofocused field alone", () => {
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();

    render(
      <PageScroller>
        <p>Overview</p>
      </PageScroller>,
    );

    // Typing beats scrolling: the console's search navigates as you type.
    expect(document.activeElement).toBe(field);
  });
});

describe("after a navigation", () => {
  it("takes focus back from the link that caused it", () => {
    const { rerender } = render(
      <PageScroller>
        <p>Overview</p>
      </PageScroller>,
    );

    // The nav link a reader clicked keeps focus across the route change, and a
    // link's nearest scrollable ancestor is not the view — so Page Down there
    // draws a ring around the link and scrolls nothing.
    const link = document.createElement("a");
    link.href = "/admin/schedules";
    document.body.append(link);
    link.focus();
    expect(document.activeElement).toBe(link);

    pathname.mockReturnValue("/admin/schedules");
    rerender(
      <PageScroller>
        <p>Schedules</p>
      </PageScroller>,
    );

    expect(document.activeElement?.tagName).toBe("MAIN");
  });

  it("does not reach into a dialog and take focus out of it", () => {
    const { rerender } = render(
      <PageScroller>
        <p>Overview</p>
      </PageScroller>,
    );

    const dialog = document.createElement("dialog");
    const confirm = document.createElement("button");
    dialog.append(confirm);
    document.body.append(dialog);
    confirm.focus();

    pathname.mockReturnValue("/admin/schedules");
    rerender(
      <PageScroller>
        <p>Schedules</p>
      </PageScroller>,
    );

    // Pulling focus out would let the keyboard escape a modal.
    expect(document.activeElement).toBe(confirm);
  });

  it("does not interrupt someone typing", () => {
    const { rerender } = render(
      <PageScroller>
        <p>Overview</p>
      </PageScroller>,
    );

    const search = document.createElement("input");
    document.body.append(search);
    search.focus();

    pathname.mockReturnValue("/admin/studies");
    rerender(
      <PageScroller>
        <p>Studies</p>
      </PageScroller>,
    );

    expect(document.activeElement).toBe(search);
  });
});

it("is reachable by Tab, so a charts-only page can still be scrolled", () => {
  const { container } = render(
    <PageScroller>
      <p>Overview</p>
    </PageScroller>,
  );

  expect(container.querySelector("main")?.tabIndex).toBe(0);
});
