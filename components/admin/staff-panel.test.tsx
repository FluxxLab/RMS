// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffPanel, type StaffAccount } from "./staff-panel";

/*
 * Editing a role and revoking access are the two things on this page that
 * change somebody else's account, so they are the two worth asserting: that
 * neither reaches the server on a single stray click, and that when it does,
 * it carries the account the row belongs to.
 */

const changeRole = vi.fn(async () => ({ ok: true, message: "Role updated." }));
const revoke = vi.fn(async () => ({ ok: true, message: "Access revoked." }));

vi.mock("@/app/(admin)/admin/actions", () => ({
  changeRole: (...args: unknown[]) => changeRole(...(args as [])),
  revoke: (...args: unknown[]) => revoke(...(args as [])),
  invite: vi.fn(async () => ({ ok: true, message: "Account created." })),
}));

beforeAll(() => {
  // Radix measures and captures the pointer; jsdom does neither.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  changeRole.mockClear();
  revoke.mockClear();
});

const users: StaffAccount[] = [
  {
    id: "u1",
    fullName: "Amara Okonkwo",
    email: "amara@bil.example",
    role: "research_assistant",
    isActive: true,
    mfaEnabled: false,
  },
  {
    id: "u2",
    fullName: "Tunde Bakare",
    email: "tunde@bil.example",
    role: "principal_investigator",
    isActive: false,
    mfaEnabled: true,
  },
];

function rowFor(name: string) {
  return screen.getByRole("row", { name: new RegExp(name) });
}

describe("StaffPanel", () => {
  it("offers Edit on every account and Revoke only on the ones still active", () => {
    render(<StaffPanel users={users} />);

    expect(within(rowFor("Amara Okonkwo")).getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(within(rowFor("Amara Okonkwo")).getByRole("button", { name: "Revoke" })).toBeTruthy();

    // Tunde is already revoked; offering it again would be a no-op that reads
    // as an action.
    expect(within(rowFor("Tunde Bakare")).getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(within(rowFor("Tunde Bakare")).queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("asks before revoking, and revokes the account whose row was clicked", async () => {
    const user = userEvent.setup();
    render(<StaffPanel users={users} />);

    await user.click(within(rowFor("Amara Okonkwo")).getByRole("button", { name: "Revoke" }));

    // The click opened a question, not a request.
    expect(revoke).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: /Revoke access/ });
    expect(within(dialog).getByText(/Amara Okonkwo/)).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "Revoke access" }));
    expect(revoke).toHaveBeenCalledWith("u1");
  });

  it("does not revoke when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    render(<StaffPanel users={users} />);

    await user.click(within(rowFor("Amara Okonkwo")).getByRole("button", { name: "Revoke" }));
    await user.click(
      within(screen.getByRole("dialog", { name: /Revoke access/ })).getByRole("button", { name: "Cancel" }),
    );

    expect(revoke).not.toHaveBeenCalled();
  });

  it("opens the edit dialog on the row's current role and saves a change", async () => {
    const user = userEvent.setup();
    render(<StaffPanel users={users} />);

    await user.click(within(rowFor("Amara Okonkwo")).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: /Edit Amara Okonkwo/ });

    // Saving is unavailable until something actually differs, so an accidental
    // open-and-save cannot write the role back over itself.
    expect(within(dialog).getByRole("button", { name: "Save role" }).hasAttribute("disabled")).toBe(true);

    await user.click(within(dialog).getByRole("combobox", { name: /Role/ }));
    await user.click(await screen.findByRole("option", { name: "Principal investigator" }));
    await user.click(within(dialog).getByRole("button", { name: "Save role" }));

    expect(changeRole).toHaveBeenCalledWith("u1", "principal_investigator");
  });

  it("does not offer the email as editable", async () => {
    const user = userEvent.setup();
    render(<StaffPanel users={users} />);

    await user.click(within(rowFor("Amara Okonkwo")).getByRole("button", { name: "Edit" }));
    const email = within(screen.getByRole("dialog", { name: /Edit Amara Okonkwo/ })).getByDisplayValue(
      "amara@bil.example",
    );

    // The audit log names people by email; changing it would detach a person
    // from their own history.
    expect((email as HTMLInputElement).disabled).toBe(true);
  });
});
