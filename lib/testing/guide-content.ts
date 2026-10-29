/*
 * What a tester should do on each screen, action by action, and what each
 * action should produce.
 *
 * Every step carries its own expected result, because "it did something" is
 * not a test. Most wasted defect reports come from correct behaviour that
 * reads as broken, a refusal that is the engine working, a pseudonym where a
 * name was expected, a slot that vanishes because a cooldown rule fired, so
 * each entry also states plainly what must not be written up.
 */

/**
 * Whether the guide is mounted at all.
 *
 * A plain constant rather than an environment variable: NEXT_PUBLIC_* values
 * are compiled in by `next build`, so a runtime binding could never switch it
 * on, and routing one through CI put the same decision in two places. Set this
 * to false and redeploy to take the guide out of every build.
 */
import type { TourTarget } from "./find-target";

export const TESTER_GUIDE_ENABLED = true;

export interface GuideStep {
  /** The action to take. */
  action: string;
  /** What should happen. If it does not, that is the defect. */
  expect: string;
  /**
   * The control this step is about, spotlit while the step is shown. Omit it
   * for a step with nothing on this page to point at, "sign out, then sign
   * in as somebody else", and the card is shown centred instead.
   */
  target?: TourTarget;
}

export interface GuideEntry {
  /** Route prefix. The longest match wins, so `/staff/bookings` beats `/staff`. */
  path: string;
  title: string;
  /** One line: what this screen is for. */
  goal: string;
  steps: GuideStep[];
  /** Correct behaviour that is commonly mistaken for a defect. */
  accept: string[];
  /** Worth raising from this screen. */
  report: string[];
}

export const GUIDE: readonly GuideEntry[] = [
  /* ---------------- authentication ---------------- */
  {
    path: "/login",
    title: "Staff sign-in",
    goal: "Get a research assistant, principal investigator or superadmin into their own console.",
    steps: [
      {
        action: "Sign in with the researcher account.",
        target: { kind: "label", text: "Email" },
        expect:
          "You land on /staff/dashboard, with Bookings, Slots, Studies, Participants and Recruitment in the top bar.",
      },
      {
        action: "Sign out, then sign in with the superadmin account.",
        expect:
          "You land on /admin instead: Overview, Studies, Schedules, Staff, Audit log. A different console, not a bigger version of the same one.",
      },
      {
        action: "As the researcher, type /admin into the address bar.",
        expect: "You are returned to /staff/dashboard. The control plane is not theirs.",
      },
      {
        action: "Sign in with a correct email and a wrong password.",
        target: { kind: "role", role: "button", name: "Sign in" },
        expect: "“That email and password do not match an account.” Nothing more specific.",
      },
      {
        action: "Try the participant's email and password here.",
        expect:
          "The same refusal, word for word. Participants sign in at /sign-in, a separate page and a separate store.",
      },
    ],
    accept: [
      "The failure message never says which half was wrong, or whether the email exists. Telling an attacker that an address is registered is a disclosure.",
      "The two roles landing on different consoles is the design, not a routing bug.",
    ],
    report: [
      "Either role landing in the other's console, or reaching the other's screens by typing the URL.",
      "An error message that names the email, or distinguishes a wrong password from an unknown account.",
    ],
  },
  {
    path: "/sign-in",
    title: "Participant sign-in",
    goal: "Get a member of the public into the portal.",
    steps: [
      {
        action: "Sign in with the participant account.",
        target: { kind: "role", role: "button", name: "Sign in" },
        expect: "You reach the portal and can see your bookings, interests and profile.",
      },
      {
        action: "Try a staff email and password here.",
        expect:
          "Refused, with the same wording as any other failure. Staff accounts do not exist in this store.",
      },
    ],
    accept: ["The vague failure message is deliberate, for both cases."],
    report: ["A staff account signing in successfully on this page."],
  },
  {
    path: "/signup",
    title: "Participant registration",
    goal: "Create an account and issue the pseudonym everything else will refer to.",
    steps: [
      {
        action: "Register with an email you have not used before.",
        target: { kind: "label", text: "Email" },
        expect:
          "An account is created and you are given a pseudonym shaped PIC/2026/LABS/XXXXX. Note it down, staff screens will only ever show you this.",
      },
      {
        action: "Register the same email a second time.",
        expect: "Refused. One account per address.",
      },
      {
        action: "Open your profile and look for your name and email.",
        expect: "They appear here, on your own profile, and nowhere else in the system.",
      },
    ],
    accept: [
      "Your name and email are written once into a separate identity vault. There is no update path and no staff screen reads from it.",
    ],
    report: [
      "A pseudonym in any other shape, or two accounts sharing one.",
      "Your name or email appearing anywhere outside your own profile page.",
    ],
  },

  /* ---------------- participant portal ---------------- */
  {
    path: "/profile",
    title: "Screening profile",
    goal: "Answer the master screening questions once, so every study can be assessed against them.",
    steps: [
      {
        action: "Set your country to Nigeria.",
        target: { kind: "text", text: "Country" },
        expect: "State and LGA become required. They are asked only of participants living there.",
      },
      {
        action: "Leave one required answer blank, save, then open any study.",
        expect:
          "You are ineligible, and the scorecard marks the unanswered rule as missing rather than failed.",
      },
      {
        action: "Return here, complete every answer, and save.",
        expect: "The profile is accepted and the scorecard re-evaluates.",
      },
    ],
    accept: [
      "An incomplete profile makes you ineligible for everything. The system fails closed: where eligibility cannot be determined, the answer is no.",
      "Answering “none” is an answer. Leaving a question untouched is not.",
    ],
    report: [
      "A profile the system treats as complete while a required answer is blank.",
      "Nigeria-only questions shown to someone living elsewhere.",
    ],
  },
  {
    path: "/bookings",
    title: "My bookings",
    goal: "Let a participant see, cancel and reschedule their own sessions without contacting staff.",
    steps: [
      {
        action: "Cancel a booking, then reopen the study it belonged to.",
        expect:
          "The seat is free again and the slot is bookable immediately, not after a delay or a staff action.",
      },
      {
        action: "Reschedule a booking into another session of the same study.",
        expect: "The old seat is released, the new one taken, and you hold exactly one active booking.",
      },
      {
        action: "Try to cancel a session whose time has passed.",
        expect: "Refused. A past session cannot be cancelled or rescheduled.",
      },
    ],
    accept: [
      "After cancelling you may still be unable to rebook, if a cooldown or lifetime cap applies to that study.",
    ],
    report: [
      "A cancelled booking whose seat is not freed, or whose slot stays marked full.",
      "A booking you can cancel twice, or one that returns to active on its own.",
    ],
  },
  {
    path: "/interests",
    title: "Research interests",
    goal: "Register the topics you would like to hear about, so recruitment can target you.",
    steps: [
      {
        action: "Add two or three interests, then remove one.",
        expect: "The list reflects your changes and survives a reload.",
      },
      {
        action: "Sign in as staff and open the Recruitment screen.",
        expect: "Your interests appear as a lead, listed against your pseudonym.",
      },
    ],
    accept: [
      "Nothing is emailed to you. Notifications are a later release, the interest is recorded, not acted on.",
    ],
    report: ["An interest that does not persist, or appears against the wrong participant."],
  },
  {
    path: "/studies",
    title: "Study detail and eligibility",
    goal: "Show, before anyone travels, exactly which rules a participant passes and which they fail.",
    steps: [
      {
        action: "Open a study and read the eligibility scorecard rule by rule.",
        target: { kind: "text", text: "Eligibility" },
        expect: "Every rule shows pass, fail or missing, in plain language rather than a code.",
      },
      {
        action: "Try to book without ticking every inclusion statement.",
        expect: "Refused. Each statement is recorded consent and all are required.",
      },
      {
        action: "Tick them all and book a session.",
        expect: "The booking is confirmed and the slot's remaining capacity drops by one.",
      },
      {
        action: "Return to the same study immediately.",
        expect:
          "You may now be ineligible for it, because of its cooldown or lifetime cap. That is the rule working.",
      },
    ],
    accept: [
      "“Missing” on the scorecard means you have not answered that question, not that the system lost your answer.",
      "Becoming ineligible for a study the moment you book it is expected behaviour.",
    ],
    report: [
      "A scorecard that says you pass, followed by a refusal when you book, or the reverse.",
      "A booking that succeeds without every statement confirmed.",
    ],
  },
  {
    path: "/",
    title: "Participant portal",
    goal: "Browse the studies currently recruiting.",
    steps: [
      {
        action: "Browse the list and open a study.",
        expect: "Only published studies with sessions in the future are listed.",
      },
      {
        action: "Open a study whose sessions are all full.",
        expect: "It is clear that nothing can be booked, rather than the booking failing after you try.",
      },
    ],
    accept: ["An empty list is a valid state. It means no study is currently recruiting."],
    report: ["A cancelled, retired or unpublished study appearing in the public list."],
  },

  /* ---------------- researcher console ---------------- */
  {
    path: "/staff/dashboard",
    title: "Operations dashboard",
    goal: "Give research staff live numbers without anyone compiling a spreadsheet.",
    steps: [
      {
        action: "Note the booking count, make a booking as the participant in another tab, then reload here.",
        target: { kind: "text", text: "Bookings" },
        expect: "The count has gone up by one.",
      },
      {
        action: "Cross-check one figure against the ledger it summarises.",
        expect: "They agree exactly.",
      },
    ],
    accept: ["Figures are read when the page loads. They do not stream, so a reload is expected."],
    report: ["A figure that disagrees with the ledger it counts."],
  },
  {
    path: "/staff/bookings",
    title: "Bookings ledger",
    goal: "Work a session: check people in, record no-shows, cancel on a participant's behalf.",
    steps: [
      {
        action: "Check a participant in.",
        target: { kind: "role", role: "button", name: /check in/i },
        expect: "Their row shows as attended, and the seat stays taken.",
      },
      {
        action: "Try to check the same participant in again.",
        expect: "Refused, or the action is unavailable. It cannot happen twice.",
      },
      {
        action: "Mark a different booking as a no-show.",
        expect:
          "Recorded as a no-show, and the seat is NOT freed. The session happened; they did not attend.",
      },
      {
        action: "Cancel a booking from here, then check the slot.",
        expect: "The seat is freed and the slot reopens for booking.",
      },
      {
        action: "Sign in as superadmin and open the audit log.",
        expect:
          "All four of the above appear, each naming the actor, their role, the action and the target.",
      },
    ],
    accept: [
      "Every row shows a pseudonym. No names, ever, that is the privacy design, not missing data.",
      "A no-show keeping the seat and a cancellation releasing it is the intended difference between them.",
    ],
    report: [
      "A name or email address anywhere in this view.",
      "A seat freed by a no-show, or not freed by a cancellation.",
      "Any of those actions missing from the audit log.",
    ],
  },
  {
    path: "/staff/slots",
    title: "Slot ledger and stress test",
    goal: "See session capacity, and prove on demand that it can never be exceeded.",
    steps: [
      {
        action: "Find a slot with capacity 1 and run the six-way concurrency stress test.",
        target: { kind: "role", role: "button", name: /stress test/i },
        expect:
          "A result reading “0 succeeded, 6 correctly rejected. No overbooking.” This is a PASS, see below.",
      },
      {
        action: "Check the slot's booked count afterwards.",
        expect: "Unchanged. The test proves the guard without consuming the seat.",
      },
      {
        action: "Book the last seat of a slot as a participant, then reload here.",
        expect: "The slot's status changes to full and it leaves the participant's bookable list.",
      },
    ],
    accept: [
      "“0 succeeded, 6 correctly rejected” is a pass. The six synthetic participants have no screening profile, so the lock refuses five and the eligibility rule refuses the sixth. Both guards are shown in one run.",
      "The test passes whenever no more than one booking succeeds and capacity is never exceeded.",
    ],
    report: [
      "More than one success, or any booked count above capacity. This is the most serious defect in the system. Raise it immediately and stop.",
    ],
  },
  {
    path: "/staff/participants",
    title: "Participant registry",
    goal: "Let staff work with participants without ever seeing who they are.",
    steps: [
      {
        action: "Search and filter the registry, then open a participant.",
        target: { kind: "role", role: "heading", name: /participant/i },
        expect:
          "A pseudonym, screening answers and booking history. No name, email, phone or NIN anywhere.",
      },
      {
        action: "Look for any way to resolve a pseudonym to a person.",
        expect: "There is none from this screen.",
      },
    ],
    accept: ["The vault-isolation notice at the top is intentional and should stay visible."],
    report: [
      "Any identifying detail at all. Treat this as high severity and stop testing until it has been triaged.",
    ],
  },
  {
    path: "/staff/recruitment",
    title: "Interest leads",
    goal: "Show who has registered interest in a topic, so a newly opened study can be filled.",
    steps: [
      {
        action: "Filter leads by a topic the test participant registered.",
        expect: "Their pseudonym appears in the results.",
      },
      {
        action: "Filter by a topic they did not register.",
        expect: "They do not appear.",
      },
    ],
    accept: ["Nothing is sent to anyone. Outreach is a later release; this is a list, not a campaign."],
    report: ["A lead shown for a topic the participant never registered, or a registered one missing."],
  },
  {
    path: "/staff/studies",
    title: "Studies (read-only for research staff)",
    goal: "Let research staff see the studies they are working on.",
    steps: [
      { action: "Open a study and read its rules and sessions.", expect: "Everything is visible." },
      {
        action: "Look for a way to change its status or edit its rules.",
        expect: "There is none. Authoring belongs to the superadmin.",
      },
    ],
    accept: [
      "A research assistant cannot author or retire a study, and the API refuses it independently.",
    ],
    report: ["A research assistant successfully changing a study's status or rules."],
  },

  /* ---------------- superadmin control ---------------- */
  {
    path: "/admin/studies",
    title: "Study authoring",
    goal: "Create a study, set its eligibility rules, and move it through its lifecycle.",
    steps: [
      {
        action: "Create a study with an IRB code, inclusion criteria and at least one exclusion rule.",
        target: { kind: "role", role: "link", name: /new study|create/i },
        expect: "It saves and appears in the list as a draft.",
      },
      {
        action: "Publish it, then look at the participant portal.",
        expect: "It appears there once it has at least one session in the future, not before.",
      },
      {
        action: "Open it as the participant and read the scorecard.",
        expect: "The rules you configured are the rules shown, worded for a member of the public.",
      },
      {
        action: "Retire the study and reload the portal.",
        expect: "It is gone from the public list and can no longer be booked.",
      },
    ],
    accept: [
      "A published study with no future sessions will not appear to participants. That is correct.",
    ],
    report: [
      "A rule configured here that the scorecard does not apply.",
      "A retired study still visible or still bookable.",
    ],
  },
  {
    path: "/admin/schedules",
    title: "Bulk scheduling",
    goal: "Publish a week of sessions in one action instead of one at a time.",
    steps: [
      {
        action: "Generate a week of sessions for a study, in a named room.",
        expect: "Every session appears with the times and room you entered, none of them in the past.",
      },
      {
        action: "Generate an overlapping session in the same room.",
        expect: "Refused. A room cannot hold two sessions at once.",
      },
      { action: "Open the participant portal.", expect: "The generated sessions are bookable." },
    ],
    accept: ["A refusal on an overlapping room booking is the rule working, not a validation bug."],
    report: [
      "Two sessions generated into the same room at the same time.",
      "Times or rooms that differ from what you entered.",
    ],
  },
  {
    path: "/admin/staff",
    title: "Staff and roles",
    goal: "Invite staff, set their role, and revoke access.",
    steps: [
      {
        action: "Invite a research assistant, then sign in as them.",
        target: { kind: "role", role: "button", name: /invite/i },
        expect: "They reach /staff/dashboard and cannot open /admin.",
      },
      {
        action: "Change their role to principal investigator, then have them sign in again.",
        expect: "The new role applies from that sign-in onward.",
      },
      {
        action: "Revoke the account and try to sign in as them.",
        expect: "Refused, with the same wording as any other failed sign-in.",
      },
    ],
    accept: ["A role change takes effect at the next sign-in, not mid-session."],
    report: ["A revoked account that still works.", "A role that grants more than it should."],
  },
  {
    path: "/admin/audit",
    title: "Audit log",
    goal: "Evidence every mutating action: who did what, to what, and when.",
    steps: [
      {
        action: "Elsewhere, perform three actions: a booking, a cancellation and a study change.",
        expect: "Nothing to see yet; come back here.",
      },
      {
        action: "Return and find all three.",
        target: { kind: "role", role: "heading", name: /audit/i },
        expect: "Each entry names the actor, their role, the action and the target, with a timestamp.",
      },
      {
        action: "Look for a way to edit or delete an entry.",
        expect: "There is none. The log is append-only, which is the point of it.",
      },
    ],
    accept: ["Targets appear as pseudonyms or identifiers, never names."],
    report: [
      "Any mutating action with no entry. This is as serious as an overbooking. The system's accountability rests on it.",
      "An entry naming the wrong actor or role.",
    ],
  },
  {
    path: "/admin",
    title: "System overview",
    goal: "One place for a lab director to see the state of the system.",
    steps: [
      {
        action: "Read each figure and compare it against the screen it summarises.",
        target: { kind: "text", text: "Studies" },
        expect: "They agree.",
      },
      {
        action: "Look for the researcher console from here.",
        expect: "It is not reachable. The two consoles are separate interfaces.",
      },
    ],
    accept: ["This is the superadmin console. Not seeing the researcher screens here is the design."],
    report: ["A figure that disagrees with its source screen."],
  },
];

/**
 * A stable identifier for one test step, shared by the app and the test plan
 * workbook. Derived from the route so it survives steps being reworded, and
 * changes only if a step is inserted or removed, at which point the sheet
 * genuinely needs regenerating.
 */
export function testId(entry: GuideEntry, index: number): string {
  const slug =
    entry.path === "/"
      ? "PORTAL"
      : entry.path.replace(/^\//, "").replace(/\//g, "-").toUpperCase();
  return `${slug}-${String(index + 1).padStart(2, "0")}`;
}

/** Every step in the plan, flattened, the order the workbook uses. */
export function allTestSteps(): Array<{
  id: string;
  area: string;
  path: string;
  step: number;
  action: string;
  expect: string;
}> {
  return GUIDE.flatMap((entry) =>
    entry.steps.map((step, index) => ({
      id: testId(entry, index),
      area: entry.title,
      path: entry.path,
      step: index + 1,
      action: step.action,
      expect: step.expect,
    })),
  );
}

/** The entry for a path, by longest matching prefix. */
export function guideFor(pathname: string): GuideEntry | null {
  let best: GuideEntry | null = null;
  for (const entry of GUIDE) {
    const hit =
      entry.path === "/"
        ? pathname === "/"
        : pathname === entry.path || pathname.startsWith(`${entry.path}/`);
    if (hit && (best === null || entry.path.length > best.path.length)) best = entry;
  }
  return best;
}
