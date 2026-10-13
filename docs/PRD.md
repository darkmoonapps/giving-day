# Product Requirements Document: Giving Day

## Problem Statement

The Latet volunteer coordinator currently manages a monthly food-package distribution day for ~140 elderly recipients and ~100 volunteers using manual processes. The current workflow involves:

- Announcing the distribution day 2 weeks in advance
- Manually contacting every volunteer via WhatsApp 2 days before to confirm attendance
- Chasing non-responders individually
- Finding replacement volunteers when someone cancels (asking who can help, prioritizing closest volunteers)
- Manually updating a Google Sheet to track all changes

This manual process is time-consuming, error-prone, and doesn't scale well. The coordinator needs a dedicated application to automate confirmations, reminders, and volunteer reassignment while maintaining the personal volunteer-elder relationships.

## Users and Roles

### Admin (Volunteer Coordinator)

- Manages the entire distribution day process
- Creates a distribution day by entering a date, then adds notes for that day and sets that day's hours
- Configures the organization from a simple, beautiful Settings area (distribution center, notification offsets and timings, day hours, notification texts and languages, default theme, org name and logo, and other app knobs)
- Manages volunteer and elder profiles
- Approves volunteer requests to change an elder's details
- Handles volunteer assignments and reassignments (no automatic reassignment)
- Views dashboards and statistics
- Access: Web dashboard (desktop) + mobile app

### Volunteer

- Confirms or declines participation for upcoming distribution days
- After confirming, marks each assigned package Picked, then Delivered or Not delivered
- Receives push notifications for confirmations, reminders, unpicked packages, and missing final status
- Can be matched with more than one elder
- Sees notes and details only for the elders assigned to them
- Can submit a request to change an elder's details; an admin must approve the change
- Access: Primarily mobile app, with web access available

## Goals

1. **Automate confirmation workflow**: Replace manual WhatsApp messaging with automated push notifications
2. **Enable self-service confirmations**: Allow volunteers to confirm or decline participation through the app
3. **Automate reminder system**: Send scheduled reminders to non-responders without manual intervention
4. **Track pickup and delivery**: Let volunteers mark each package Picked, then Delivered or Not delivered
5. **Streamline reassignment**: Surface cancelled or not-delivered cases for the admin; the admin decides what to do (no automatic reassignment)
6. **Centralize data management**: Replace Google Sheets with a proper database for volunteer and elder data
7. **Provide visibility**: Give admins real-time dashboards showing confirmation status, coverage gaps, and statistics
8. **Build relationships**: Maintain volunteer-elder matching (one volunteer may be matched with more than one elder)
9. **Guide the route**: Show an optimized map route that starts at the admin-configured distribution center, with a Navigate menu (Google Maps, Apple Maps, Waze) on each address
10. **Admin-configurable product**: An admin can configure everything from the app through a simple, beautiful Settings area

## Principles

**An admin can configure everything from the app through a simple, beautiful Settings area.** Settings is the single place for organization knobs. No code change or deploy is required for day-to-day configuration. Configurable items include:

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
5. **Multi-organization support**: Single-organization solution for now
6. **Advanced scheduling**: Beyond simple monthly distribution days (no complex recurring patterns initially)
7. **Automatic reassignment**: The system does not reassign elders or packages on its own; the admin decides

## Core User Flows

### Flow 1: Admin Creates a Distribution Day

1. Admin logs into web dashboard
2. Navigates to "Create Distribution Day"
3. Enters a date (that is the only required field to create the day)
4. Optionally adds notes for that day and sets that day's hours
5. System shows list of all volunteers and their match status
6. Admin confirms creation
7. System sends initial notification to all volunteers

### Flow 2: Volunteer Confirms Participation

1. Volunteer receives push notification: "Can you deliver on [date]?"
2. Opens app (or clicks notification)
3. Sees only the distribution day details (date, hours, and day notes). The volunteer does not see assigned elders on this screen
4. Taps "Confirm" or "Can't make it"
5. If they confirm, a fireworks thank-you screen appears
6. Confirmation immediately updates in admin dashboard

### Flow 3: Automated Reminders

1. Distribution day is created
2. System schedules reminder job for non-responders
3. After configured time (e.g., 1 day), system identifies volunteers who haven't responded
4. Sends automated reminder push notification
5. Tracks reminder history for each volunteer

### Flow 4: Volunteer Cancellation and Reassignment

1. Volunteer declines or cancels participation
2. Their assigned elder appears in admin's "Needs Deliverer" list
3. Admin views list of available volunteers, sorted by proximity to elder
4. Admin selects a volunteer and sends notification
5. Replacement volunteer confirms or declines
6. Process repeats until elder is covered
7. There is no automatic reassignment; the admin decides

### Flow 5: Admin Views Dashboard

1. Admin opens dashboard
2. Sees overview: total volunteers, confirmed count, pending count, cancelled count, unassigned elders
3. Views list of elders needing deliverers
4. Sees who responded, who's pending, who declined
5. Clicks individual volunteer/elder for detailed information

### Flow 6: Volunteer Pickup and Delivery

1. After confirming attendance, the volunteer sees each assigned package
2. The volunteer marks each package Picked
3. After pickup, the volunteer marks the package Delivered or Not delivered
4. Not delivered opens a notes popup; the volunteer enters a note
5. The note is sent to the admin and saved
6. The system does not reassign the package automatically; the admin decides the next step
7. When the volunteer has finished all deliveries (every assigned package has a final status), a fireworks thank-you screen appears

### Flow 7: Volunteer Requests an Elder Detail Change

1. Volunteer views notes and details for an elder assigned to them
2. Volunteer submits a request to change the elder's details (for example address or notes)
3. Admin reviews the request and approves or rejects it
4. Approved changes update the elder record; rejected requests leave the record unchanged

### Flow 8: Map and Navigation

1. Volunteer opens the map for their assigned elders
2. The map shows an optimized route that starts at the distribution center address (set by an admin on the Settings page)
3. Each address has a Navigate menu with Google Maps, Apple Maps, and Waze

### Flow 9: Pickup and Status Reminder Pushes

1. If a package is not marked Picked one hour before the distribution window ends, the system sends a push notification. An admin can configure this offset.
2. If a package is Picked but has no final status (Delivered or Not delivered) after an admin-configured wait (default 3 days), the system sends a reminder push.

## Feature List

### Phase 1: Foundation & Management

- [ ] User authentication (Google & Facebook OAuth)
- [ ] Role-based access control (Admin, Volunteer)
- [ ] Volunteer profile management (CRUD)
- [ ] Elder profile management (CRUD)
  - Full address, including building entrance and building code
  - Notes textarea per elder
- [ ] Volunteer-elder matching and assignment (a volunteer can be matched with more than one elder)
- [ ] Volunteer visibility limited to notes and details of assigned elders
- [ ] Volunteer requests to change elder details; admin approval
- [ ] Create distribution day (date required; optional notes and hours for that day)
- [ ] Simple, beautiful Settings area where an admin configures the organization
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
- [ ] Volunteer cancellation handling
- [ ] "Needs Deliverer" list for admins
- [ ] Volunteer replacement suggestions (sorted by proximity)
- [ ] Manual reassignment by admin only (no automatic reassignment)
- [ ] Package status: Picked, then Delivered or Not delivered
- [ ] Not delivered notes popup; note sent to admin and saved
- [ ] Fireworks thank-you screen when the volunteer finishes all deliveries
- [ ] Push if packages are not Picked before the window ends (default 1 hour; admin-configurable offset)
- [ ] Push if Picked with no final status after the wait (default 3 days; admin-configurable)

### Phase 3: Dashboards & Analytics

- [ ] Admin overview dashboard
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

- Working authentication with Google/Facebook
- Admin can manage volunteers and elders (full address, notes)
- A volunteer can be matched with more than one elder
- Volunteers see notes and details only for assigned elders
- Volunteers can request elder detail changes; admin approves
- Admin can create a distribution day by entering a date, add notes per day, and set that day's hours
- Admin can configure the organization from Settings (distribution center, notification offsets and timings, day hours, notification texts and languages, default theme, org name and logo)
- Light "Wisteria & mint" theme by default and a deep-plum dark theme; users can toggle the theme and it follows the system preference
- Database schema and API endpoints for core entities (schema still to be designed with the product owner)

**Success Criteria**: Admin can log in, manage volunteer/elder profiles, create a distribution day from a date, and configure settings

### Phase 2: Confirmations & Automation

**Scope**: Push notifications, confirmation workflow, pickup/delivery status, reminders, admin-led reassignment

**Deliverables**:

- Push notification infrastructure
- Volunteer confirmation UI shows only distribution day details (not assigned elders); fireworks thank-you after confirm
- Package flow: Picked, then Delivered or Not delivered
- Not delivered notes popup; note sent to admin and saved
- Fireworks thank-you when all deliveries are finished
- Unpicked-package push (default 1 hour before window end; configurable)
- Picked-without-final-status reminder (default 3 days; configurable)
- Scheduled confirmation reminders
- Reassignment workflow with proximity-based suggestions; admin decides (no automatic reassignment)

**Success Criteria**: Volunteers receive notifications, confirm attendance, mark pickup and delivery, and admins handle not-delivered and cancellation cases

### Phase 3: Dashboards & Visibility

**Scope**: Admin dashboards, statistics, reporting

**Deliverables**:

- Real-time dashboard showing confirmation status
- Pickup and delivery status, including not-delivered notes
- Statistics and metrics for each distribution day
- Historical reporting
- Enhanced filtering and search

**Success Criteria**: Admin has clear visibility into confirmation status, coverage gaps, package outcomes, and can make data-driven decisions

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
- Self-service confirmation rate (target: >80% without admin intervention)

### Quality Metrics

- Data accuracy vs. old Google Sheet method
- Reduction in missed deliveries
- Volunteer-elder relationship consistency
- Percentage of packages with a final status (Delivered or Not delivered) after the configured wait

## Open Questions

### Database Schema Design

The database schema for volunteers, elders, distribution days, confirmations, and assignments needs to be designed with the product owner. Key considerations:

- Volunteer profile fields (name, contact, location, availability preferences, etc.)
- Elder profile fields (name, full address including building entrance and building code, notes textarea, dietary requirements, special needs, etc.)
- How to store volunteer change requests for elder details and admin approval
- Distribution day configuration and state management (date, notes, hours)
- Confirmation and response tracking
- Package status (Picked, Delivered, Not delivered) and not-delivered notes
- Assignment history and relationship tracking (a volunteer may have more than one elder)
- Audit trail for admin-decided reassignments

The schema itself remains undecided. No implementation or migration is specified in this document.

### Push Notification Strategy

Still open:

- Which push notification service? (Firebase Cloud Messaging, OneSignal, native platform services)
- Notification permission strategy for web PWA
- Fallback handling for failed notifications

Resolved (see Resolved Decisions): when to send unpicked and missing-final-status pushes, and that those offsets are admin-configurable.

### Proximity Calculation

- How to calculate volunteer-to-elder proximity? (straight-line distance, driving distance, manual admin input)
- Should we store coordinates or use address geocoding?
- Privacy considerations for location data

### Internationalization & Accessibility

- Hebrew RTL layout requirements and testing
- English LTR support level (full feature parity or basic)
- Accessibility standards to meet (WCAG 2.1 AA?)
- Screen reader compatibility

### Scalability & Performance

- Expected growth beyond current 140 elders / 100 volunteers?
- Real-time update requirements for dashboard
- Mobile app offline support requirements

### Security & Privacy

- Data retention policies
- GDPR/local privacy law requirements
- Backup and disaster recovery strategy

Resolved (see Resolved Decisions): a volunteer sees notes and details only for elders assigned to them.

### Resolved Decisions

These items were previously open or unspecified. They are now product decisions (examples below use fake data only):

- **Matching**: A volunteer can be matched with more than one elder (for example volunteer "Maya Cohen" with elders "Rivkah Levi" and "Yosef Abraham").
- **Elder address**: The elder address is the full address, including building entrance and building code (for example "12 Example St, Entrance B, code 1234, Tel Aviv").
- **Elder notes**: Each elder has a notes textarea. Volunteers may submit requests to change an elder's details; an admin approves them before they apply.
- **Volunteer visibility**: A volunteer sees notes and details only for the elders assigned to them. Assigned elders are not shown on the confirmation screen (Flow 2); that screen shows only distribution day details.
- **Admin Settings**: An admin can configure everything from the app through a simple, beautiful Settings area, including distribution center address, notification offsets and timings, day hours, notification texts and languages, default theme, and org name/logo.
- **Theming**: Light theme by default with a pastel "Wisteria & mint" palette (wisteria `#A99BE0` primary, mint `#A8E6CF` accent; mint for Delivered states). Dark theme uses deep plum `#1E1A2E` as the background with brightened accents. Users can toggle the theme and it follows the system preference.
- **Distribution day creation**: An admin creates a distribution day by entering just a date. The admin can add notes per day and sets that day's hours.
- **Distribution center**: An admin sets the distribution center address on the Settings page. Example: "10 Warehouse Rd, Holon".
- **Map**: The map shows an optimized route that starts at the distribution center address.
- **Navigate menu**: Each address has a Navigate menu with Google Maps, Apple Maps, and Waze.
- **Volunteer delivery flow**: Confirm attendance, then mark each package Picked, then mark it Delivered or Not delivered.
- **Not delivered**: Opens a notes popup. The note is sent to the admin and saved. There is no automatic reassignment; the admin decides.
- **Thank-you screens**: A fireworks thank-you screen appears when the volunteer confirms attendance and again when they finish all deliveries.
- **Unpicked push**: If packages are not Picked one hour before the window ends, send a push. An admin can configure this offset.
- **Missing final status push**: If a package is Picked but has no final status after an admin-configured wait (default 3 days), send a reminder push.
