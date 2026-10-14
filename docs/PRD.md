# Product Requirements Document: Giving Day

## Problem Statement

Latet volunteer coordinators currently manage monthly food-package
distribution days (about 140 elderly recipients and 100 volunteers in a
typical city) using manual processes. The current workflow involves:

- Announcing the distribution day 2 weeks in advance
- Manually contacting every volunteer via WhatsApp 2 days before to confirm attendance
- Chasing non-responders individually
- Finding replacement volunteers when someone cancels (asking who can help, prioritizing closest volunteers)
- Manually updating a Google Sheet to track all changes

This manual process is time-consuming, error-prone, and does not scale
across cities. Coordinators need a dedicated application to automate
confirmations, reminders, and **manual** volunteer reassignment while
keeping volunteer–elder matches. The product is **multi-city**: each city
has its own elders, volunteers, settings, and days. See
[docs/data-model.md](./data-model.md) and [docs/rbac.md](./rbac.md).

## Users and Roles

Roles are **Volunteer**, **City coordinator**, and **Super admin**. The
legacy word "admin" in older flows means **city coordinator**. The same
person can be a coordinator in one city and a volunteer in another.

### Super admin

- Creates cities and the first coordinator join link for a new city
- Can read and update every city; can set `isSuperAdmin` on users
- Set only from the seed CLI or by another super admin
- Access: web dashboard

### City coordinator

- Manages one city's distribution days, elders, volunteers, and matches
- Creates a distribution day by entering a date, then adds notes and hours
- Configures **city** settings (distribution center, notification offsets,
  day hours, notification texts and languages, default theme, org name and
  logo, and other knobs)
- Creates join links (single-use, 48 hours) and **approves** pending
  memberships (volunteer or coordinator). Approval is always required
- Approves volunteer requests to change an elder's details
- Handles assignments and reassignments (**no automatic reassignment**)
- Views city dashboards and statistics
- Access: web dashboard (desktop) + mobile

### Volunteer

- Joins a city through a join link, then waits for coordinator approval
- Confirms, declines, or cancels participation for published days
- After confirming, marks each assigned package Picked, then Delivered or
  Not delivered
- Receives push notifications for confirmations, reminders, unpicked
  packages, missing final status, and membership approval
- Can be matched with more than one elder
- Sees notes and details only for elders assigned to them
- Can submit a request to change an elder's details; a coordinator must
  approve
- Access: primarily mobile, with web available

## Goals

1. **Automate confirmation workflow**: Replace manual WhatsApp messaging with automated push notifications
2. **Enable self-service confirmations**: Allow volunteers to confirm or decline participation through the app
3. **Automate reminder system**: Send scheduled reminders to non-responders without manual intervention
4. **Track pickup and delivery**: Let volunteers mark each package Picked, then Delivered or Not delivered
5. **Streamline reassignment**: When a volunteer declines or cancels, their
   deliveries become unassigned and appear on the city's "Needs a volunteer"
   list. The coordinator decides; the system never auto-reassigns
6. **Centralize data management**: Replace Google Sheets with a city-scoped
   database for volunteer and elder data
7. **Provide visibility**: Give coordinators real-time dashboards showing
   confirmation status, coverage gaps, and statistics
8. **Build relationships**: Maintain volunteer-elder matching (one volunteer
   may be matched with more than one elder)
9. **Guide the route**: Show an optimized map route that starts at the
   coordinator-configured distribution center, with a Navigate menu (Google
   Maps, Apple Maps, Waze) on each address
10. **City-configurable product**: A coordinator can configure their city
    from a simple, beautiful Settings area
11. **Multi-city tenancy**: Isolate elders, volunteers, days, and settings
    per city, with super-admin oversight

## Principles

**A city coordinator can configure their city from a simple, beautiful Settings area.** Settings is the single place for city knobs. No code change or deploy is required for day-to-day configuration. Configurable items include:

- Distribution center address (start of the volunteer map route)
- Notification offsets and timings (confirmation reminders; unpicked-package warning before the window ends; wait after Picked before a missing-final-status reminder; default 3 days for that wait)
- Distribution day hours (defaults and per-day hours)
- Notification texts and languages
- Default theme
- Organization name and logo

## Non-Goals

1. **Native app store distribution (Phase 1)**: Start as a PWA, native apps can be added later with Capacitor
2. **Real-time chat**: Not building an in-app messaging system; WhatsApp integration is a later phase
3. **Payment processing**: Not handling any financial transactions
4. **Third-party routing engines**: The in-app map shows an optimized route from the distribution center; we are not integrating a commercial fleet-routing product
5. **Multi-organization support**: Single organization (Latet). Multi-**city**
   is in scope; a second organization tenant is not
6. **Advanced scheduling**: Beyond simple monthly distribution days (no complex recurring patterns initially)
7. **Automatic reassignment**: The system never assigns a declined, cancelled,
   or not-delivered package to another volunteer. Decline/cancel moves those
   deliveries to unassigned; the coordinator decides
8. **Self-serve city join without approval**: Join links always create a
   pending membership
9. **SMS / Apple Sign In in MVP**: Google and Facebook OAuth only (Apple later)

## Core User Flows

### Flow 1: Coordinator Creates a Distribution Day

1. City coordinator logs into the web dashboard
2. Navigates to "Create Distribution Day"
3. Enters a date (that is the only required field to create the day)
4. Optionally adds notes for that day and sets that day's hours
5. System prefills one delivery per active elder with a current permanent
   match; the coordinator adjusts as needed
6. Coordinator confirms creation and publishes
7. System sends the initial notification to the city's volunteers

### Flow 2: Volunteer Confirms Participation

1. Volunteer receives push notification: "Can you deliver on [date]?"
2. Opens app (or clicks notification)
3. Sees only the distribution day details (date, hours, and day notes). The volunteer does not see assigned elders on this screen
4. Taps "Confirm" or "Can't make it"
5. If they confirm, a fireworks thank-you screen appears
6. Confirmation immediately updates in the city coordinator dashboard

### Flow 3: Automated Reminders

1. Distribution day is created
2. System schedules reminder job for non-responders
3. After configured time (e.g., 1 day), system identifies volunteers who haven't responded
4. Sends automated reminder push notification
5. Tracks reminder history for each volunteer

### Flow 4: Volunteer Cancellation and Reassignment

1. Volunteer declines or cancels participation
2. Their deliveries on that day are set to unassigned (`volunteerId` null)
   immediately and appear on the coordinator's "Needs a volunteer" list
3. Coordinator views available volunteers, sorted by proximity (home area)
4. Coordinator selects a volunteer and sends a notification
5. Replacement volunteer confirms or declines
6. Process repeats until the elder is covered
7. There is no automatic reassignment

### Flow 5: Coordinator Views Dashboard

1. City coordinator opens the city dashboard
2. Sees overview: total volunteers, confirmed count, pending count, cancelled count, unassigned elders
3. Views the "Needs a volunteer" list
4. Sees who responded, who is pending, who declined
5. Opens an individual volunteer or elder for details

### Flow 6: Volunteer Pickup and Delivery

1. After confirming attendance, the volunteer sees each assigned package
2. The volunteer marks each package Picked
3. After pickup, the volunteer marks the package Delivered or Not delivered
4. Not delivered opens a notes popup; the volunteer enters a note
5. The note is sent to the city coordinator and saved
6. The system does not reassign the package automatically; the coordinator decides the next step
7. When the volunteer has finished all deliveries (every assigned package has a final status), a fireworks thank-you screen appears

### Flow 7: Volunteer Requests an Elder Detail Change

1. Volunteer views notes and details for an elder assigned to them
2. Volunteer submits a request to change the elder's details (for example address or notes)
3. City coordinator reviews the request and approves or rejects it
4. Approved changes update the elder record; rejected requests leave the record unchanged

### Flow 8: Map and Navigation

1. Volunteer opens the map for their assigned elders
2. The map shows an optimized route that starts at the distribution center address (set by a coordinator on the city Settings page)
3. Each address has a Navigate menu with Google Maps, Apple Maps, and Waze

### Flow 9: Pickup and Status Reminder Pushes

1. If a package is not marked Picked one hour before the distribution window ends, the system sends a push notification. A coordinator can configure this offset.
2. If a package is Picked but has no final status (Delivered or Not delivered) after a coordinator-configured wait (default 3 days), the system sends a reminder push.

### Flow 10: Join a City

1. Coordinator (or super admin) creates a join link for volunteer or
   coordinator role. The link is single-use and expires in 48 hours
2. They share it (typically WhatsApp)
3. The person signs in with Google or Facebook, finishes onboarding if needed,
   and opens the link
4. A pending city membership is created; the user sees "waiting for approval"
5. A city coordinator approves; the user receives a push
6. A leaked link cannot grant access without that approval

## Feature List

### Phase 1: Foundation & Management

- [ ] User authentication (Google & Facebook OAuth; onboarding; sessions)
- [ ] Multi-city tenancy and role-based access (Volunteer, City coordinator, Super admin)
- [ ] Join links (single-use, 48h) with coordinator approval
- [ ] Volunteer profile management (CRUD)
- [ ] Elder profile management (CRUD)
  - Full address, including building entrance and building code
  - Notes textarea per elder
- [ ] Volunteer-elder matching and assignment (a volunteer can be matched with more than one elder)
- [ ] Volunteer visibility limited to notes and details of assigned elders
- [ ] Volunteer requests to change elder details; coordinator approval
- [ ] Create distribution day (date required; optional notes and hours for that day; prefill from permanent matches)
- [ ] Simple, beautiful Settings area where a coordinator configures the city
  - Distribution center address
  - Notification offsets and timings
  - Day hours
  - Notification texts and languages
  - Default theme
  - Organization name and logo
- [ ] Light theme by default: pastel "Wisteria & mint" (wisteria `#A99BE0` primary, mint `#A8E6CF` accent; mint for Delivered states)
- [ ] Dark theme: deep plum `#1E1A2E` background with brightened accents
- [ ] Theme toggle; follows the system preference
- [ ] View upcoming distribution days

### Phase 2: Confirmations & Notifications

- [ ] Push notification setup and delivery
- [ ] Volunteer confirmation flow (confirm/decline)
- [ ] Fireworks thank-you screen after confirming attendance
- [ ] Automated reminder scheduling
- [ ] Reminder job execution for non-responders
- [ ] Volunteer cancellation handling (deliveries become unassigned immediately)
- [ ] "Needs a volunteer" list for coordinators
- [ ] Volunteer replacement suggestions (sorted by proximity)
- [ ] Manual reassignment by coordinator only (no automatic reassignment)
- [ ] Package status: Picked, then Delivered or Not delivered
- [ ] Not delivered notes popup; note sent to coordinator and saved
- [ ] Fireworks thank-you screen when the volunteer finishes all deliveries
- [ ] Push if packages are not Picked before the window ends (default 1 hour; coordinator-configurable offset)
- [ ] Push if Picked with no final status after the wait (default 3 days; coordinator-configurable)

### Phase 3: Dashboards & Analytics

- [ ] Coordinator overview dashboard
  - Confirmation statistics
  - Coverage metrics
  - Response rates
  - Historical trends
  - Pickup and delivery status
  - Not-delivered notes
- [ ] Volunteer list with status filters
- [ ] Elder coverage status view
- [ ] Distribution day detail view with all participants

### Phase 4: Enhanced Features (Later)

- [ ] Map integration showing an optimized route that starts at the distribution center
- [ ] Navigate menu on each address: Google Maps, Apple Maps, and Waze
- [ ] WhatsApp API integration for fallback messaging
- [ ] SMS fallback for volunteers without smartphones
- [ ] Distribution day templates
- [ ] Bulk volunteer import/export

## Phased Roadmap

### Phase 1: Foundation & Management

**Scope**: Authentication, data management, distribution day creation

**Deliverables**:

- Working authentication with Google/Facebook, onboarding, and join-link approval
- Super admin can create a city; coordinator can manage that city's volunteers and elders
- A volunteer can be matched with more than one elder
- Volunteers see notes and details only for assigned elders
- Volunteers can request elder detail changes; coordinator approves
- Coordinator can create a distribution day by entering a date, add notes per day, and set that day's hours
- Coordinator can configure the city from Settings (distribution center, notification offsets and timings, day hours, notification texts and languages, default theme, org name and logo)
- Light "Wisteria & mint" theme by default and a deep-plum dark theme; users can toggle the theme and it follows the system preference
- Approved data model documented in [docs/data-model.md](./data-model.md) (implementation and Prisma later)

**Success Criteria**: Coordinator can log in, manage volunteer/elder profiles in their city, create a distribution day from a date, and configure city settings

### Phase 2: Confirmations & Automation

**Scope**: Push notifications, confirmation workflow, pickup/delivery status, reminders, coordinator-led reassignment

**Deliverables**:

- Push notification infrastructure
- Volunteer confirmation UI shows only distribution day details (not assigned elders); fireworks thank-you after confirm
- Package flow: Picked, then Delivered or Not delivered
- Not delivered notes popup; note sent to coordinator and saved
- Fireworks thank-you when all deliveries are finished
- Unpicked-package push (default 1 hour before window end; configurable)
- Picked-without-final-status reminder (default 3 days; configurable)
- Scheduled confirmation reminders
- Reassignment workflow with proximity-based suggestions; coordinator decides (no automatic reassignment)
- Decline/cancel immediately unassigns that volunteer's deliveries

**Success Criteria**: Volunteers receive notifications, confirm attendance, mark pickup and delivery, and coordinators handle not-delivered and cancellation cases

### Phase 3: Dashboards & Visibility

**Scope**: Coordinator dashboards, statistics, reporting

**Deliverables**:

- Real-time dashboard showing confirmation status
- Pickup and delivery status, including not-delivered notes
- Statistics and metrics for each distribution day
- Historical reporting
- Enhanced filtering and search

**Success Criteria**: Coordinator has clear visibility into confirmation status, coverage gaps, package outcomes, and can make data-driven decisions

### Phase 4+: Advanced Features

**Scope**: Maps, navigation, WhatsApp integration

**Deliverables**:

- Map view with an optimized route starting at the distribution center address
- Navigate menu on each address (Google Maps, Apple Maps, Waze)
- WhatsApp API integration for messaging fallback

**Success Criteria**: Volunteers can follow an optimized route and open Google Maps, Apple Maps, or Waze from each address; system can send WhatsApp messages when push fails

## Success Metrics

### Efficiency Metrics

- Time saved for coordinator (target: 80% reduction in manual coordination time)
- Response rate to automated notifications (target: >85%)
- Time to full confirmation (target: <24 hours)

### Coverage Metrics

- Percentage of elders with confirmed deliverer 24h before distribution (target: >95%)
- Average time to find replacement volunteer (target: <2 hours)

### Engagement Metrics

- Volunteer app adoption rate (target: >90%)
- Notification open rate (target: >70%)
- Self-service confirmation rate (target: >80% without coordinator intervention)

### Quality Metrics

- Data accuracy vs. old Google Sheet method
- Reduction in missed deliveries
- Volunteer-elder relationship consistency
- Percentage of packages with a final status (Delivered or Not delivered) after the configured wait

## Open Questions

### Database Schema Design

**Resolved.** The MVP model lives in [docs/data-model.md](./data-model.md).
No Prisma implementation or migration ships with this documentation
change. Remaining later items (Apple Sign In, retention jobs, CSV,
WhatsApp/SMS) are listed there under "MVP vs later."

### Push Notification Strategy

Still open:

- Which push notification service? (Firebase Cloud Messaging, OneSignal, native platform services)
- Notification permission strategy for web PWA
- Fallback handling for failed notifications

Resolved (see Resolved Decisions): when to send unpicked and missing-final-status pushes, and that those offsets are coordinator-configurable.

### Proximity Calculation

- How to calculate volunteer-to-elder proximity? (straight-line distance, driving distance, volunteer `homeArea`)
- Elders store optional lat/lng and `geocodeStatus`; volunteers store neighborhood only (`homeArea`), never a home street address
- Privacy considerations for location data

### Internationalization & Accessibility

- Hebrew is the default language and document direction (`dir="rtl"`)
- English is full-parity LTR, switched from the language switcher
- Accessibility target is WCAG 2.1 AA
- Screen reader compatibility via semantic HTML, ARIA labels, and Mantine

### Scalability & Performance

- Expected growth beyond current 140 elders / 100 volunteers?
- Real-time update requirements for dashboard
- Mobile app offline support requirements

### Security & Privacy

- Data retention policies
- GDPR/local privacy law requirements
- Backup and disaster recovery strategy

Resolved (see Resolved Decisions): a volunteer sees notes and details only
for elders assigned to them. Multi-city scoping, roles, join-link rules,
and decline/cancel unassignment are also resolved.

### Resolved Decisions

These items were previously open or unspecified. They are now product decisions (examples below use fake data only):

- **Matching**: A volunteer can be matched with more than one elder (for example volunteer "Maya Cohen" with elders "Rivkah Levi" and "Yosef Abraham").
- **Elder address**: The elder address is the full address, including building entrance and building code (for example "12 Example St, Entrance B, code 1234, Tel Aviv").
- **Elder notes**: Each elder has volunteer notes and coordinator-only notes. Volunteers may submit requests to change an elder's details; a coordinator approves them before they apply.
- **Volunteer visibility**: A volunteer sees notes and details only for the elders assigned to them. Assigned elders are not shown on the confirmation screen (Flow 2); that screen shows only distribution day details.
- **City Settings**: A coordinator can configure their city from a simple, beautiful Settings area, including distribution center address, notification offsets and timings, day hours, notification texts and languages, default theme, and org name/logo.
- **Theming**: Light theme by default with a pastel "Wisteria & mint" palette (wisteria `#A99BE0` primary, mint `#A8E6CF` accent; mint for Delivered states). Dark theme uses deep plum `#1E1A2E` as the background with brightened accents. Users can toggle the theme and it follows the system preference.
- **Distribution day creation**: A coordinator creates a distribution day by entering just a date. They can add notes per day and set that day's hours. Creating a day prefills deliveries from current permanent matches.
- **Distribution center**: A coordinator sets the distribution center address on the city Settings page. Example: "10 Warehouse Rd, Holon".
- **Map**: The map shows an optimized route that starts at the distribution center address.
- **Navigate menu**: Each address has a Navigate menu with Google Maps, Apple Maps, and Waze.
- **Volunteer delivery flow**: Confirm attendance, then mark each package Picked, then mark it Delivered or Not delivered.
- **Not delivered**: Opens a notes popup. The note is sent to the coordinator and saved. There is no automatic reassignment; the coordinator decides.
- **Thank-you screens**: A fireworks thank-you screen appears when the volunteer confirms attendance and again when they finish all deliveries.
- **Unpicked push**: If packages are not Picked one hour before the window ends, send a push. A coordinator can configure this offset.
- **Missing final status push**: If a package is Picked but has no final status after a coordinator-configured wait (default 3 days), send a reminder push.
- **Multi-city**: Tenant is city. City-owned tables carry `cityId`. Super admin creates cities. See [ADR 0019](./adr/0019-multi-tenant-city-scoping.md).
- **Roles**: Volunteer, City coordinator, Super admin. Permissions are per city. See [docs/rbac.md](./rbac.md).
- **Auth**: Google and Facebook OAuth, then onboarding. Join links are single-use, expire after 48 hours, and still require coordinator approval. See [ADR 0020](./adr/0020-oauth-join-link-auth.md).
- **Decline / cancel**: The volunteer's deliveries on that day move to unassigned and appear on the "Needs a volunteer" list. They are never auto-reassigned.
