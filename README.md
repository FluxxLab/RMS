# BIL RMS Frontend

Web tier of the Behavioural Insights Lab Research Management System. One Next.js
application serves three audiences: a public participant portal, a researcher
console and a superadmin control surface.

The browser holds no business rules. Eligibility, capacity, duplicate detection
and every lifecycle transition are decided by the NestJS research API. This tier
loads data, renders the verdict and disables what the API would refuse.

## Interfaces

| Interface | Route group | Served at | Audience |
|---|---|---|---|
| Participant portal | `app/(portal)` | `/` | Public |
| Researcher console | `app/(staff)` | `/staff` | Research assistants, principal investigators |
| Superadmin control | `app/(admin)` | `/admin` | Lab directors, sysadmins |
| Staff sign in | `app/(auth)` | `/login` | Staff accounts |

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router, React Server Components, Turbopack |
| UI runtime | React 19 |
| Language | TypeScript in strict mode |
| Styling | Tailwind CSS 4 with Fluent 2 design tokens |
| Validation | Zod at every boundary |
| Unit and component tests | Vitest, React Testing Library, jsdom |
| Journey and accessibility tests | Playwright with axe |
| Package manager | pnpm 10 |

## Requirements

* Node.js 20 or later
* pnpm 10 or later
* A running instance of the research API

## Getting started

```bash
pnpm install
echo "API_BASE_URL=http://127.0.0.1:3000" > .env.local
pnpm dev
```

The development server listens on `http://localhost:3000`.

## Environment

All values are read on the server. Nothing here reaches the browser bundle.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `API_BASE_URL` | Yes | `http://127.0.0.1:3000` | Base URL of the NestJS research API |
| `BASE_URL` | No | `http://localhost:3007` | Target the Playwright suite runs against |
| `BIL_STAFF_EMAIL` | For journey tests | none | Seeded staff account used by the Playwright sign in step |
| `BIL_STAFF_PASSWORD` | For journey tests | none | Password for that account |
| `BIL_PARTICIPANT_EMAIL` | For journey tests | none | Seeded participant account |
| `BIL_PARTICIPANT_PASSWORD` | For journey tests | none | Password for that account |

Credentials are never committed. `.env*` files are excluded from version control.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint across the project |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit and component suites |
| `pnpm test:e2e` | Playwright journey and accessibility suites |
| `pnpm test:all` | Vitest followed by Playwright |

## Project structure

```
app/
  layout.tsx              root document, fonts, global stylesheet
  (portal)/               participant portal: browse, study detail, bookings,
                          screening wizard, interests, profile
  (staff)/                researcher console: dashboard, slot ledger, bookings
                          ledger, participant registry, interest leads, studies
  (admin)/                superadmin control: studies, schedules, staff users,
                          taxonomy, audit log
  (auth)/                 staff sign in
  api/                    route handlers for the transaction log stream and
                          audit export
components/
  fluent/                 design system primitives
  shell/                  application chrome: nav bar, app rail, footer
  portal/                 participant composition
  staff/, admin/          console composition
  dashboard/              KPI tiles, charts, live transaction log
  ui/                     shared pieces: empty state, stat tile, vault notice
  icons/                  inline SVG icon set
lib/
  api/                    the single typed client, Zod response schemas,
                          session reading, pagination
  types.ts                domain types and status unions
  format.ts               deterministic date, time and pseudonym formatters
  dashboard.ts            KPI derivations
  audit.ts, slots.ts, participants.ts   pure derivations
  engine-messages.ts      API result code to participant facing copy
e2e/                      Playwright specs and shared helpers
```

## Architecture

**Server first.** Components are React Server Components by default. `"use client"`
appears only on the leaf that needs state, an event handler or a browser API, never
on a page or a layout. Derivations that express a rule stay on the server so the
rule never ships to the browser.

**One door to the API.** `lib/api/client.ts` is the only module that issues a
request. It is marked `server-only`, resolves the base URL once, attaches the
session cookie and validates every response against a Zod schema. Components never
call `fetch` and never see a URL.

**The session is opaque to the browser.** Sign in returns an httpOnly cookie the
browser cannot read. The client reads the token payload solely to decide what to
render. Authorisation is enforced by the API on every request.

**Result codes map to copy, nothing else.** The API answers a refused reservation
with its own code: `not_found`, `cancelled`, `full`, `duplicate`,
`criteria_not_confirmed`, `ineligible` or `locked`. `lib/engine-messages.ts` turns
each into approved wording. No `catch` block invents a message.

**Live views stream.** The transaction log and dashboard KPIs subscribe over Server
Sent Events with a polling fallback, reconciled so a KPI never disagrees with the
ledger it summarises.

**Deterministic rendering.** Timestamps travel as UTC ISO 8601 and are formatted by
`lib/format.ts` alone, so the server and the browser emit identical output. The
current time arrives as a value, never as a call to `Date.now()` inside a component.

## Privacy

Participant names and email addresses live in a physically separate vault and are
written exactly once. Everything a staff surface renders is keyed by a pseudonym of
the form `PIC/YYYY/LABS/XXXXX`.

* No staff facing type, prop, response schema, URL, query key, cookie, log line or
  analytics payload carries a name or an email address.
* Screening and health answers are shown to the participant who gave them and to
  nobody else. They never appear in a staff view, an export or a notification.
* Error reporting receives a pseudonym or an opaque identifier only.
* Identity resolution is a separately authorised and audited API operation. No
  route in this application calls it.

## Testing

```bash
pnpm test        # Vitest: pure functions in lib/ and component behaviour
pnpm test:e2e    # Playwright: booking journey and accessibility sweeps
```

Unit tests cover the derivations in `lib/`. Component tests assert behaviour
through roles and labels rather than implementation detail. Playwright signs in
once, reuses the stored session, walks the booking journey by keyboard and runs an
axe scan over every surface. Test names carry the requirement identifier they
prove.

## Accessibility

The target is WCAG 2.2 AA with zero automated violations. Every journey is operable
from the keyboard with a visible focus ring, status is conveyed by icon and text
rather than colour alone, and the portal is usable at a 360 pixel viewport. The axe
scan runs as part of the Playwright suite.

## Deployment

`pnpm build` produces a standard Next.js production build; `pnpm start` serves it.
`API_BASE_URL` must be set in the runtime environment and must be reachable from
the server, not from the browser.

## Licence

Proprietary. Internal to the Behavioural Insights Lab.
