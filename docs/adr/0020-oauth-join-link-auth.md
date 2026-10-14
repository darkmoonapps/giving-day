# ADR 0020: OAuth and join-link authentication

**Status**: Accepted

**Date**: 2026-10-15

## Context

Coordinators and volunteers need to sign in without SMS cost and without
storing passwords. Cities must stay closed: a person should not see elders
or days until a coordinator admits them.

WhatsApp is how coordinators already share information. A shareable join
link fits that habit, but a leaked long-lived link would be an access
risk, especially for coordinator-role invites.

Apple Sign In needs a paid Apple developer account and is deferred.

This ADR does not implement auth. It records the product decision for
[docs/rbac.md](../rbac.md) and [docs/data-model.md](../data-model.md).

## Decision

**Login is OAuth only in MVP: Google and Facebook.** Each successful
login creates or links a `User` and an `AuthIdentity`. One user may link
several providers. `apple` exists on the enum for later.

**Onboarding** runs when `onboardedAt` is null: full name, E.164 phone,
locale, and privacy acceptance. Elders never log in.

**City access is invite-only:**

- A coordinator (or super admin) creates a `CityInvite` and shares it
  (typically WhatsApp).
- Owner-approved invite rules: **single-use**, **expires after 48
  hours**, and **always requires coordinator approval**.
- Redeeming a valid link after login creates a `CityMembership` with
  `status = pending` and the invite's role.
- Coordinator-role links still need approval so a leaked link cannot
  grant coordinator access.
- Super admins create new cities and the first coordinator invite.
- Users with no active membership see a waiting-for-approval screen.

**Sessions:** 15-minute access JWT plus a rotating refresh token in an
`httpOnly`, `Secure`, `SameSite=Lax` cookie. Refresh TTL is 90 days for
volunteers and 14 days for coordinators. Removing a membership revokes
all of that user's sessions.

No SMS, WhatsApp, or password login in MVP.

## Consequences

### Positive

- No SMS spend; no password store
- Join links match existing WhatsApp coordination
- Short expiry and single-use limit blast radius of a leaked link
- Approval keeps humans in the loop for both volunteer and coordinator
  roles

### Negative

- Users without Google or Facebook cannot sign in until Apple or another
  provider is added
- A 48-hour single-use link can expire before someone opens WhatsApp
- Coordinators must approve every join, including their own peers

### Mitigation

- Coordinators can mint a new link if the first expires unused
- Super admin can seed the first coordinator when a city is created
- Session revocation on membership removal limits leftover access

## Alternatives considered

### SMS one-time codes

**Rejected for MVP.** Cost and operational complexity. Push and OAuth
are enough for smartphone volunteers.

### Long-lived multi-use invite (14 days)

**Rejected by owner.** Single-use and 48 hours, with approval still
required.

### Auto-approve after a valid link

**Rejected.** A forwarded or screenshotted link would grant city access.
Pending + approve is mandatory.

### Email magic links only

**Rejected as the sole method.** Coordinators already use WhatsApp and
social login; OAuth plus a WhatsApp-shared invite is simpler.

## Notes

- This is documentation only. No auth code ships in this change.
- Apple Sign In is later.
- Refresh-token storage is hashed (`Session.refreshTokenHash`).
