/*
 * What a tester should do on each screen, and — more usefully — what they
 * should not write up.
 *
 * Most wasted defect reports come from correct behaviour that reads as broken:
 * a refusal that is the engine working, a pseudonym where a name was expected,
 * a slot that disappears because the cooldown rule fired. Each entry therefore
 * carries an `accept` list alongside the steps, so the answer is on the screen
 * rather than in a document nobody opened.
 */

/**
 * Whether the guide is mounted at all.
 *
 * A plain constant rather than an environment variable: NEXT_PUBLIC_* values
 * are compiled in by `next build`, so a runtime binding could never switch it
 * on, and routing one through CI put the same decision in two places. Set this
 * to false and redeploy to take the guide out of every build.
 */
export const TESTER_GUIDE_ENABLED = true;

export interface GuideEntry {
  /** Route prefix. The longest match wins, so `/staff/bookings` beats `/staff`. */
  path: string;
  title: string;
  /** One line: what this screen is for. */
  goal: string;
  /** What to try, in order. */
  steps: string[];
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
      "Sign in with the researcher account. You should land on the researcher console dashboard.",
      "Sign out, then sign in with the superadmin account. You should land on the admin control plane instead.",
      "Try a wrong password, then a participant's email and password.",
    ],
    accept: [
      "Both failures say the same thing — the message never reveals which half was wrong, or whether the email exists.",
      "A participant account cannot sign in here. Participants use the portal sign-in, a different page and a different store.",
      "The two roles land on different consoles by design. Superadmins do not get the researcher console, and researchers do not get the admin screens.",
    ],
    report: [
      "Either role landing in the other's console.",
      "An error message that names the email, or distinguishes a wrong password from an unknown account.",
    ],
  },
  {
    path: "/sign-in",
    title: "Participant sign-in",
    goal: "Get a member of the public into the portal.",
    steps: [
      "Sign in with the participant account.",
      "Try a staff email and password here.",
    ],
    accept: [
      "Staff accounts do not work on this page. Staff and participants are entirely separate stores.",
      "The failure message is deliberately vague for both cases.",
    ],
    report: ["A staff account successfully signing in here."],
  },
  {
    path: "/signup",
    title: "Participant registration",
    goal: "Create an account and issue the pseudonym everything else will refer to.",
    steps: [
      "Register a new participant with an email you have not used before.",
      "Try registering the same email a second time.",
      "Note the pseudonym you are given — it looks like PIC/2026/LABS/XXXXX.",
    ],
    accept: [
      "Your name and email are stored once, in a separate identity vault. No staff screen will ever show them.",
      "A repeated email is refused. One account per address.",
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
      "Work through every question and save.",
      "Leave one answer blank, save, and try to book a study.",
      "If you set your country to Nigeria, note that state and LGA become required.",
    ],
    accept: [
      "An incomplete profile makes you ineligible for everything. The system fails closed — where eligibility cannot be determined, the answer is no.",
      "State and LGA are asked only of participants living in Nigeria. They are not missing for everyone else.",
      "Answering 'none' is an answer. Leaving a question untouched is not.",
    ],
    report: [
      "A profile the system calls complete while a required answer is blank.",
      "A question asked of the wrong group — Nigerian-only questions shown to someone abroad.",
    ],
  },
  {
    path: "/bookings",
    title: "My bookings",
    goal: "Let a participant see, cancel and reschedule their own sessions without contacting staff.",
    steps: [
      "Cancel a booking, then check whether that slot returns to the study page.",
      "Reschedule a booking into another session of the same study.",
      "Try to cancel a session that has already happened.",
    ],
    accept: [
      "Cancelling frees the seat and reopens the slot in the same action — the slot should come back immediately, not after a refresh cycle.",
      "A past session cannot be cancelled or rescheduled.",
      "After cancelling you may still be ineligible to rebook, if a cooldown or lifetime cap applies.",
    ],
    report: [
      "A cancelled booking whose seat is not freed, or whose slot stays marked full.",
      "A booking you can cancel twice, or one that reappears as active.",
    ],
  },
  {
    path: "/interests",
    title: "Research interests",
    goal: "Register the topics you would like to hear about, so recruitment can target you.",
    steps: ["Add two or three interests, then remove one.", "Check they persist after a reload."],
    accept: ["Nothing is emailed to you — notifications are a later release. The interest is recorded, not acted on."],
    report: ["An interest that does not persist, or appears against the wrong participant."],
  },
  {
    path: "/studies",
    title: "Study detail and eligibility",
    goal: "Show, before anyone travels, exactly which rules a participant passes and which they fail.",
    steps: [
      "Open a study and read the eligibility scorecard rule by rule.",
      "Confirm each inclusion statement, then book a session.",
      "Return to the same study immediately after booking.",
    ],
    accept: [
      "Every rule shows pass, fail or missing. 'Missing' means you have not answered it, not that the system lost it.",
      "You must tick every inclusion statement before the booking is allowed — this is recorded consent, not a formality.",
      "After booking you may become ineligible for that study at once, because of its cooldown or lifetime cap. That is the rule working.",
    ],
    report: [
      "A scorecard that says you pass, followed by a refusal when you book — or the reverse.",
      "Booking succeeding without every statement confirmed.",
    ],
  },
  {
    path: "/",
    title: "Participant portal",
    goal: "Browse the studies currently recruiting.",
    steps: ["Browse the list and open a study.", "Check that a study with no free sessions is handled sensibly."],
    accept: [
      "Only published studies with future sessions appear. An empty list is a valid state, not an error.",
    ],
    report: ["A cancelled or unpublished study appearing in the public list."],
  },

  /* ---------------- researcher console ---------------- */
  {
    path: "/staff/dashboard",
    title: "Operations dashboard",
    goal: "Give research staff live numbers without anyone compiling a spreadsheet.",
    steps: [
      "Note the figures, make a booking in another tab, and reload.",
      "Cross-check one number against the bookings ledger.",
    ],
    accept: ["Figures are read when the page loads. They do not stream — a reload is expected."],
    report: ["A figure that disagrees with the ledger it is counting."],
  },
  {
    path: "/staff/bookings",
    title: "Bookings ledger",
    goal: "Work a session: check people in, record no-shows, cancel on a participant's behalf.",
    steps: [
      "Check a participant in, then try to check the same one in twice.",
      "Mark another as a no-show.",
      "Cancel a booking here and confirm the slot reopens.",
    ],
    accept: [
      "Every row shows a pseudonym. No names, ever — that is the privacy design, not missing data.",
      "A no-show does not free the seat. The session happened; the participant did not attend.",
      "A cancellation does free the seat and reopens the slot.",
    ],
    report: [
      "A name or email address anywhere in this view.",
      "A seat freed by a no-show, or not freed by a cancellation.",
      "An action that leaves no entry in the audit log.",
    ],
  },
  {
    path: "/staff/slots",
    title: "Slot ledger and stress test",
    goal: "See session capacity, and prove on demand that it can never be exceeded.",
    steps: [
      "Run the six-way concurrency stress test on a one-seat slot.",
      "Read the result carefully before judging it.",
      "Book the last seat of a slot and watch its status change.",
    ],
    accept: [
      "'0 succeeded, 6 correctly rejected. No overbooking.' is a PASS. The six synthetic participants have no screening profile, so the lock refuses five and the eligibility rule refuses the sixth — both guards demonstrated in one run.",
      "The test passes whenever no more than one booking succeeds and capacity is never exceeded.",
    ],
    report: [
      "More than one success, or any count above capacity. This is the single most serious defect in the system — raise it immediately.",
    ],
  },
  {
    path: "/staff/participants",
    title: "Participant registry",
    goal: "Let staff work with participants without ever seeing who they are.",
    steps: ["Search and filter the registry.", "Open a participant and read what is shown."],
    accept: [
      "Pseudonyms only. There is no name, email, phone or NIN here, and no way to reach one from this screen.",
      "The vault-isolation notice at the top is intentional and should stay visible.",
    ],
    report: ["Any identifying detail at all. Treat this as high severity and stop testing until it is triaged."],
  },
  {
    path: "/staff/recruitment",
    title: "Interest leads",
    goal: "Show who has registered interest in a topic, so a newly opened study can be filled.",
    steps: ["Filter leads by topic.", "Cross-check one lead against the interests a participant registered."],
    accept: [
      "Leads are listed by pseudonym.",
      "Nothing is sent to anyone. Outreach is a later release; this is a list, not a campaign.",
    ],
    report: ["A lead for a topic the participant never registered."],
  },
  {
    path: "/staff/studies",
    title: "Studies (read-only for research staff)",
    goal: "Let research staff see the studies they are working on.",
    steps: ["Open a study and read its rules and sessions."],
    accept: [
      "A research assistant cannot author or retire a study. That is the superadmin's job and the API refuses it here.",
    ],
    report: ["A research assistant successfully changing a study's status or rules."],
  },

  /* ---------------- superadmin control ---------------- */
  {
    path: "/admin/studies",
    title: "Study authoring",
    goal: "Create a study, set its eligibility rules, and move it through its lifecycle.",
    steps: [
      "Create a study with an IRB code, inclusion criteria and at least one exclusion rule.",
      "Publish it, then check it appears in the participant portal.",
      "Retire it and check it leaves the portal.",
    ],
    accept: [
      "A study with no future sessions will not appear to participants even when published.",
      "Rules you set here are what the eligibility scorecard will show participants — test one end to end.",
    ],
    report: [
      "A rule configured here that the scorecard does not apply.",
      "A retired study still bookable.",
    ],
  },
  {
    path: "/admin/schedules",
    title: "Bulk scheduling",
    goal: "Publish a week of sessions in one action instead of one at a time.",
    steps: [
      "Generate a week of sessions for a study.",
      "Try to generate overlapping sessions in the same room.",
      "Check the generated sessions appear to participants.",
    ],
    accept: [
      "A room cannot hold two sessions of the same study at once — a refusal here is correct.",
      "Sessions in the past are not offered to participants.",
    ],
    report: ["Two sessions generated into the same room at the same time.", "Times or rooms that differ from what you entered."],
  },
  {
    path: "/admin/staff",
    title: "Staff and roles",
    goal: "Invite staff, set their role, and revoke access.",
    steps: [
      "Invite a research assistant and sign in as them.",
      "Change their role to principal investigator and note what changes.",
      "Revoke them and confirm they can no longer sign in.",
    ],
    accept: [
      "A revoked account is refused at sign-in with the same vague message as any other failure.",
      "Role changes take effect on the next sign-in, not mid-session.",
    ],
    report: ["A revoked account that still works.", "A role that grants more than it should."],
  },
  {
    path: "/admin/audit",
    title: "Audit log",
    goal: "Evidence every mutating action: who did what, to what, and when.",
    steps: [
      "Perform three actions elsewhere — a booking, a cancellation, a study change.",
      "Return here and find all three.",
      "Check each entry names the actor, their role, the action and the target.",
    ],
    accept: [
      "Targets appear as pseudonyms or identifiers, never names.",
      "Entries cannot be edited or deleted. That is the point of the log.",
    ],
    report: [
      "Any mutating action with no entry. This is as serious as an overbooking — the system's accountability rests on it.",
      "An entry naming the wrong actor or role.",
    ],
  },
  {
    path: "/admin",
    title: "System overview",
    goal: "One place for a lab director to see the state of the system.",
    steps: ["Read the figures and compare one against the screen it summarises."],
    accept: ["This is the superadmin console. The researcher console is a separate interface you will not see from here."],
    report: ["A figure that disagrees with its source screen."],
  },
];

/** The entry for a path, by longest matching prefix. */
export function guideFor(pathname: string): GuideEntry | null {
  let best: GuideEntry | null = null;
  for (const entry of GUIDE) {
    const hit = entry.path === "/" ? pathname === "/" : pathname === entry.path || pathname.startsWith(`${entry.path}/`);
    if (hit && (best === null || entry.path.length > best.path.length)) best = entry;
  }
  return best;
}
