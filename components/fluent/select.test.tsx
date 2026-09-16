import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Select } from "./select";

/*
 * Radix drives its listbox with pointer capture and scrolls the active item
 * into view — neither of which jsdom implements. Stubbing them is what lets the
 * real component be tested rather than a mock of it.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const OPTIONS = (
  <>
    <option value="">Choose…</option>
    <option value="csv">CSV</option>
    <option value="json">JSON</option>
  </>
);

describe("Select", () => {
  it("renders a button, not the operating system's select", () => {
    const { container } = render(<Select aria-label="Format">{OPTIONS}</Select>);

    expect(screen.getByRole("combobox", { name: "Format" }).tagName).toBe("BUTTON");
    // Radix keeps a hidden native select for form submission; it must stay hidden.
    for (const native of container.querySelectorAll("select")) {
      expect(native.getAttribute("aria-hidden")).toBe("true");
    }
  });

  /*
   * The empty option is the placeholder and must not become a choosable item —
   * Radix reserves the empty string for "nothing chosen" and throws on an item
   * carrying it. That the trigger *displays* the placeholder is verified in a
   * real browser instead: Radix resolves the selected label through a portal
   * that jsdom leaves empty, so asserting it here would test jsdom, not us.
   */
  it("keeps the empty option out of the list, as the placeholder", async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Format">{OPTIONS}</Select>);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["CSV", "JSON"]);
  });

  it("reports a choice the way a native change event would", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select aria-label="Format" onChange={onChange}>
        {OPTIONS}
      </Select>,
    );

    // Keyboard rather than pointer: jsdom has no real pointer, and this is the
    // path a keyboard user takes anyway.
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ target: { value: expect.any(String) } });
  });

  /*
   * The audit export is uncontrolled and submits through the form, so a
   * defaultValue must survive and reach a hidden field the form can read.
   */
  it("keeps an uncontrolled default and submits it under its name", () => {
    const { container } = render(
      <form>
        <Select aria-label="Format" name="format" defaultValue="csv">
          {OPTIONS}
        </Select>
      </form>,
    );

    const hidden = container.querySelector("select[name='format']") as HTMLSelectElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("csv");
  });

  it("groups options under their optgroup label", async () => {
    const user = userEvent.setup();
    render(
      <Select aria-label="Country">
        <option value="">Choose…</option>
        <optgroup label="Nearby">
          <option value="NG">Nigeria</option>
        </optgroup>
        <optgroup label="All countries">
          <option value="GH">Ghana</option>
          <option value="KE">Kenya</option>
        </optgroup>
      </Select>,
    );

    await user.click(screen.getByRole("combobox"));
    const groups = screen.getAllByRole("group");
    expect(within(groups[0]).getByRole("option", { name: "Nigeria" })).toBeTruthy();
    expect(within(groups[1]).getAllByRole("option").map((o) => o.textContent)).toEqual(["Ghana", "Kenya"]);
  });

  it("can be disabled", () => {
    render(
      <Select aria-label="Format" disabled>
        {OPTIONS}
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
  });

  it("marks itself invalid for the field wrapper", () => {
    render(
      <Select aria-label="Format" invalid>
        {OPTIONS}
      </Select>,
    );
    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe("true");
  });
});
