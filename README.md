# Bright Smile Dental — Web client

Next.js 15 + TypeScript + Tailwind client for a dental appointment booking
platform: a marketing site, a multi-step booking flow, patient appointment
management, an admin dashboard, and an AI assistant over Socket.IO.

This is a **standalone application**. It talks to the API purely over HTTP and
websockets at `NEXT_PUBLIC_API_URL` — there are no file-level dependencies on
the backend repository.

```
app/                 routes (RSC where the data is stable)
├── page.tsx         landing
├── book/            booking flow
├── appointments/    the patient's own appointments
├── admin/           staff dashboard
├── login/ register/ profile/
└── services/ contact/

components/
├── ui/              Button, Card, Input, Modal, Toast, Feedback
├── layout/          Header, Footer, ThemeToggle, ProtectedRoute, AuthShell
├── booking/         DatePicker, SlotPicker, BookingFlow, BookingSuccess
├── appointments/    AppointmentCard, RescheduleModal
├── admin/           StatCards, AppointmentTable, modals
├── chatbot/         ChatWidget, ChatMessage
└── home/            Hero, marketing sections

hooks/               useAuth, useTheme, useChat
services/            typed API client, one function per endpoint
lib/                 formatting and validation helpers
types/               mirrors the API contract
```

> **Prototype.** Built as a technical assessment.

---

## Quick start

Requires **Node.js 18.17+** and the API running (default `http://localhost:4000`).

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on `:3000` |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | Types only |
| `npm run format` / `format:check` | Prettier |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API. Socket.IO connects to the same origin. |

`NEXT_PUBLIC_*` values are **inlined into the browser bundle at build time** —
never put a secret here, and remember that changing it requires a rebuild, not
just a restart.

When deploying, set it to the deployed API's public URL, and make sure that API
lists this app's origin in its `FRONTEND_URL` — otherwise CORS blocks every
request and the websocket handshake is refused.

### Signing in

Accounts come from the API's seed data and are **not shown in the UI**:

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Admin | `admin@brightsmiledental.com` | `Admin@123` | `/admin` |
| Patient | `zain@example.com` | `Patient@123` | `/appointments` |

Sign-in routes by role. A `?next=` destination is honoured **only if the role
may actually go there** — otherwise it is dropped and the role's home is used.
Registering always creates a patient and lands on `/`.

---

## Architecture

### Rendering

Marketing pages (`/`, `/services`, `/contact`) are **server components**: clinic
details are fetched on the server so the page arrives fully rendered rather than
flashing skeletons for content that changes about once a year.

The booking flow, chat, appointments and admin are **client components**,
because they are interactive and depend on live state. Availability is
deliberately never server-rendered — it changes minute to minute.

### State

Authentication is the only global state, in `hooks/useAuth.tsx`. Everything else
(slots, appointments, chat) is fetched where it is used; sharing it globally
would buy nothing and make staleness a problem.

On mount the stored token is **verified against `/auth/me`** rather than
decoded client-side, so a deleted account or a changed role takes effect
immediately. A `storage` listener keeps multiple tabs in sync.

### Route access

`lib/route-policy.ts` is the single source of truth for who may see what. The
guard, the redirects and the navigation links all read from it, so the nav can
never offer a link the guard would bounce.

| Route | Access |
| --- | --- |
| `/`, `/services`, `/contact`, `/login`, `/register` | Everyone |
| `/book` | Everyone **except administrators** — guests must be able to book |
| `/appointments` | Patients only |
| `/profile` | Any signed-in user (an admin still needs their own settings) |
| `/admin/*` | Administrators only |

Someone who does not belong is **redirected**, not shown a "restricted" screen:
parking a patient on `/admin` invites them to keep trying, and the URL implies
the page is theirs to reach. A toast explains the bounce once.

Because administrators are kept out of `/book`, the dashboard has its own
**New appointment** dialog, which posts to `POST /api/admin/appointments` — the
same appointment service, validation and double-booking constraint the public
form uses.

`?next=` is validated against the signed-in role before being followed. Without
that check the sign-in chain hands out access it should not: a guest bounced
from `/admin` lands on `/login?next=/admin`, and registering from there would
deliver a brand-new patient straight to an admin route. Absolute URLs are
refused too, so the login page cannot become an open redirect.

> As always, this is **UX, not security**. The API verifies the JWT and the role
> on the server for every `/api/admin/*` request.

### API layer

Every network call goes through `services/api-client.ts`, which attaches the
token, unwraps the API envelope, and converts failures into a typed `ApiError`
carrying the server's own patient-safe message, per-field validation issues, and
any alternative slot times. Components never touch `fetch`.

### The browser holds no booking rules

The slot grid renders exactly what `GET /api/appointments/availability` returns.
Opening hours, the 30-minute grid, past-slot filtering and closed days are all
decided server-side. Any duplicated copy of those rules here would eventually
disagree with the ones the API enforces.

A `409` when someone books the same slot first is handled inline: the
alternatives the server returns are rendered as one-tap buttons rather than an
error the patient has to recover from.

---

## Fonts

**Fonts are committed to `app/fonts/` and loaded with `next/font/local`.**

`next/font/google` downloads the files from Google's CDN *during the build*,
which makes every build depend on a third-party network call. When that call
fails the build fails outright, and the error is opaque — the loader reports
`TypeError: Cannot read properties of null (reading '1')` because it tries to
parse a stylesheet it never received. It is also environment-dependent: the same
commit builds locally and fails in a hosted build container.

Self-hosting removes the dependency. Builds are deterministic, work offline, and
cannot be broken by someone else's CDN. Both faces are variable fonts, so one
file per family (48 KB + 28 KB) covers every weight, and `next/font/local` still
preloads them and generates the size-adjusted fallback that prevents layout
shift.

## Theming

Three states — `light`, `dark`, and `system` (the default) — persisted to
`localStorage`.

Colours are CSS custom properties in `app/globals.css`, referenced through
Tailwind as semantic tokens. Components name a **role** (`surface`,
`content-muted`, `brand-solid`), never a literal colour, so switching themes is
that one file rather than a second set of `dark:` classes everywhere.

The dark palette is designed rather than inverted: surfaces are warm slate blues
sitting slightly above pure black so cards separate by elevation, and the brand
hue is lifted because a mid-teal that reads confidently on white goes muddy on a
dark ground.

Three brand tokens exist specifically to make contrast a contract rather than a
judgement call:

| Token | Meaning | Light | Dark |
| --- | --- | --- | --- |
| `brand-solid` | A filled brand surface | teal-700 | mint |
| `brand-on-solid` | The **only** text colour allowed on it | white (5.47:1) | deep teal ink (5.81:1) |
| `brand-text` | Brand-coloured text on canvas | teal-700 (5.24:1) | mint (7.72:1) |

Because the palette inverts in dark mode, picking a shade by eye is how you end
up with near-white text on light mint at 1.4:1. The tokens prevent that.

A blocking inline script in `app/layout.tsx` applies the stored theme **before
first paint** — without it every visit flashes light before the dark theme
lands.

---

## Accessibility

- **Audited at zero WCAG AA contrast failures** across 5 pages × both themes.
- One focus-visible treatment defined globally.
- Modals trap Tab, restore focus to the trigger, close on Escape, and lock body
  scroll with the scrollbar gutter preserved so the page does not shift.
- Form fields wire label, hint and error together with generated ids and
  `aria-describedby`, so errors are announced with their field.
- Slot buttons carry an accessible name explaining *why* one is unavailable —
  the strike-through conveys that visually only.
- Toasts render in an `aria-live` region.
- A skip link precedes the navigation.
- Every animation is decorative and disabled under `prefers-reduced-motion`.

---

## Real-time chat

`hooks/useChat.ts` owns the socket lifecycle and the message list. The widget
itself stays presentational.

Over a socket the typing indicator starts the moment the server begins work and
the reply lands the moment it finishes; polling would either add latency or
waste requests. The connection is **not opened until the widget is first used**,
so a visitor who never opens it pays nothing.

Handled: optimistic echo replaced by the persisted row, per-message
sent/failed state with retry, automatic reconnection that **re-joins** the
session (the transcript is server-side, so a reconnect restores full history),
and an **HTTP fallback** for networks that block websockets — running the
identical chat service, so behaviour is the same either way.

When the assistant returns slots they render as tappable chips, because the
point of conversational booking is lost if choosing still means retyping
"2:30 PM" exactly right.

---

## Responsive design

Mobile-first, verified from 390 px with no horizontal overflow anywhere.

- The admin table becomes a card stack below `lg` — a horizontally scrolling
  table on a phone is technically responsive and practically unusable.
- The chat is a bottom sheet capped at 85dvh rather than fullscreen, so a
  patient mid-booking does not lose their place to ask a question.
- The date strip is a horizontal scroller, which behaves identically on both
  and keeps the slot grid above the fold on a phone.
- Modals are full-width sheets on mobile, centred dialogs from `sm` up.

---

## Verification

```bash
npm run typecheck
npm run build
```

The user journeys were driven in a real browser (Playwright) across both themes
and at mobile width — **50 checks, zero console errors**:

| Group | Covers |
| --- | --- |
| Landing | Hero, CTA, services / dentists / hours rendered from the API |
| Dark mode | Class on `<html>`, dark canvas, persisted, survives reload, **applied before first paint** |
| Guest booking | All four steps through to the success state with a reference |
| Signed-in booking | Name, email and phone prefilled from the profile |
| Routing | USER → `/appointments`, ADMIN → `/admin`; credentials not exposed in the UI |
| Role guards | 23-check access matrix: guest/patient/admin × every protected route, plus `?next=` escalation attempts |
| Chat | Opens, socket connected, assistant answers, real slot chips |
| Admin | USER sees "Restricted area"; admin gets counters, table, badges, filter, search, row menu, detail and edit modals, confirm dialog |
| Responsive | 390 px: no overflow, mobile menu, chat sheet leaves the page visible |

---

## Assumptions and limitations

- The API must be reachable at `NEXT_PUBLIC_API_URL`; there is no mock mode.
- The auth token is kept in `localStorage` so a refreshed tab can restore its
  session. That is readable by any script on the origin, so an XSS bug would
  expose it. The API also sets an `httpOnly` cookie; moving fully to it needs
  CSRF protection this prototype does not implement.
- The route guard in `ProtectedRoute` is a **courtesy, not security** — it saves
  a patient a confusing empty screen. Every admin endpoint verifies the role
  server-side, so removing the component from the bundle yields a page that
  renders empty and fills with 403s. The guard runs on the client, so a blocked
  page may render for a frame before the redirect; nothing sensitive is fetched
  in that time because the API would refuse it anyway.
- No email verification or password reset flows.
- Not internationalised; copy and date formats assume `en-GB`.
