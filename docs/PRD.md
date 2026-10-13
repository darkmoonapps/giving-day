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
- Creates and configures monthly distribution days
- Manages volunteer and elder profiles
- Handles volunteer assignments and reassignments
- Views dashboards and statistics
- Access: Web dashboard (desktop) + mobile app

### Volunteer

- Confirms or declines participation for upcoming distribution days
- Receives push notifications for confirmations and reminders
- Matched to a specific elder to build an ongoing relationship
- Views their assigned elder information
- Access: Primarily mobile app, with web access available

## Goals

1. **Automate confirmation workflow**: Replace manual WhatsApp messaging with automated push notifications
2. **Enable self-service confirmations**: Allow volunteers to confirm or decline participation through the app
3. **Automate reminder system**: Send scheduled reminders to non-responders without manual intervention
4. **Streamline reassignment**: Surface cancelled volunteers' elders as "needs a deliverer" with intelligent suggestions (closest volunteers first)
5. **Centralize data management**: Replace Google Sheets with a proper database for volunteer and elder data
6. **Provide visibility**: Give admins real-time dashboards showing confirmation status, coverage gaps, and statistics
7. **Build relationships**: Maintain the volunteer-elder matching system to foster personal connections

## Non-Goals

1. **Native app store distribution (Phase 1)**: Start as a PWA, native apps can be added later with Capacitor
2. **Real-time chat**: Not building an in-app messaging system; WhatsApp integration is a later phase
3. **Payment processing**: Not handling any financial transactions
4. **Route optimization**: Map/navigation features are for later phases
5. **Multi-organization support**: Single-organization solution for now
6. **Advanced scheduling**: Beyond simple monthly distribution days (no complex recurring patterns initially)

## Core User Flows

### Flow 1: Admin Creates a Distribution Day

1. Admin logs into web dashboard
2. Navigates to "Create Distribution Day"
3. Selects date and time for the distribution
4. System shows list of all volunteers and their match status
5. Admin confirms creation
6. System sends initial notification to all volunteers

### Flow 2: Volunteer Confirms Participation

1. Volunteer receives push notification: "Can you deliver on [date]?"
2. Opens app (or clicks notification)
3. Sees distribution day details and assigned elder
4. Taps "Confirm" or "Can't make it"
5. Confirmation immediately updates in admin dashboard

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

### Flow 5: Admin Views Dashboard

1. Admin opens dashboard
2. Sees overview: total volunteers, confirmed count, pending count, cancelled count, unassigned elders
3. Views list of elders needing deliverers
4. Sees who responded, who's pending, who declined
5. Clicks individual volunteer/elder for detailed information

## Feature List

### Phase 1: Foundation & Management

- [ ] User authentication (Google & Facebook OAuth)
- [ ] Role-based access control (Admin, Volunteer)
- [ ] Volunteer profile management (CRUD)
- [ ] Elder profile management (CRUD)
- [ ] Volunteer-elder matching and assignment
- [ ] Create distribution day (date, time, basic config)
- [ ] View upcoming distribution days

### Phase 2: Confirmations & Notifications

- [ ] Push notification setup and delivery
- [ ] Volunteer confirmation flow (confirm/decline)
- [ ] Automated reminder scheduling
- [ ] Reminder job execution for non-responders
- [ ] Volunteer cancellation handling
- [ ] "Needs Deliverer" list for admins
- [ ] Volunteer replacement suggestions (sorted by proximity)
- [ ] Manual reassignment by admin

### Phase 3: Dashboards & Analytics

- [ ] Admin overview dashboard
  - Confirmation statistics
  - Coverage metrics
  - Response rates
  - Historical trends
- [ ] Volunteer list with status filters
- [ ] Elder coverage status view
- [ ] Distribution day detail view with all participants

### Phase 4: Enhanced Features (Later)

- [ ] Map integration showing elder locations
- [ ] Waze/Google Maps navigation links
- [ ] WhatsApp API integration for fallback messaging
- [ ] SMS fallback for volunteers without smartphones
- [ ] Distribution day templates
- [ ] Bulk volunteer import/export

## Phased Roadmap

### Phase 1: Foundation & Management

**Scope**: Authentication, data management, distribution day creation

**Deliverables**:

- Working authentication with Google/Facebook
- Admin can manage volunteers and elders
- Admin can create a distribution day
- Database schema and API endpoints for core entities

**Success Criteria**: Admin can log in, manage volunteer/elder profiles, and create a distribution day

### Phase 2: Confirmations & Automation

**Scope**: Push notifications, confirmation workflow, reminders, reassignment

**Deliverables**:

- Push notification infrastructure
- Volunteer confirmation UI
- Scheduled reminder system
- Reassignment workflow with proximity-based suggestions

**Success Criteria**: Volunteers receive notifications, can confirm/decline, non-responders get reminders automatically, admin can reassign cancelled volunteers

### Phase 3: Dashboards & Visibility

**Scope**: Admin dashboards, statistics, reporting

**Deliverables**:

- Real-time dashboard showing confirmation status
- Statistics and metrics for each distribution day
- Historical reporting
- Enhanced filtering and search

**Success Criteria**: Admin has clear visibility into confirmation status, coverage gaps, and can make data-driven decisions

### Phase 4+: Advanced Features

**Scope**: Maps, navigation, WhatsApp integration

**Deliverables**:

- Map view of elder locations
- Navigation link generation
- WhatsApp API integration for messaging fallback

**Success Criteria**: Volunteers can navigate to elders via map apps, system can send WhatsApp messages when push fails

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

## Open Questions

### Database Schema Design

The database schema for volunteers, elders, distribution days, confirmations, and assignments needs to be designed with the product owner. Key considerations:

- Volunteer profile fields (name, contact, location, availability preferences, etc.)
- Elder profile fields (name, address, dietary requirements, special needs, etc.)
- Distribution day configuration and state management
- Confirmation and response tracking
- Assignment history and relationship tracking
- Audit trail for reassignments

### Push Notification Strategy

- Which push notification service? (Firebase Cloud Messaging, OneSignal, native platform services)
- Notification permission strategy for web PWA
- Fallback handling for failed notifications

### Proximity Calculation

- How to calculate volunteer-to-elder proximity? (straight-line distance, driving distance, manual admin input)
- Should we store coordinates or use address geocoding?
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
- Volunteer/elder data access controls
- Backup and disaster recovery strategy
