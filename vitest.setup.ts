import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/*
 * Each test starts from an empty document. Without this a component left
 * mounted by one test is still found by the next, and a passing suite can be
 * asserting against markup nobody rendered on purpose.
 */
afterEach(() => {
  cleanup();
});

/*
 * jsdom has no canvas, and axe probes for one while measuring contrast. The
 * probe is harmless but prints on every run, which trains people to ignore the
 * output — so it is answered rather than left to warn.
 */
if (typeof HTMLCanvasElement !== "undefined") {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
}

/*
 * jsdom implements <dialog> but not its modal methods, so a component that
 * calls showModal() throws before it renders anything. The real element also
 * hides its content until opened; mirroring that with the `open` attribute is
 * what lets a test tell an open dialog from a closed one.
 */
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
