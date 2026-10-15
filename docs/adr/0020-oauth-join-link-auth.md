# ADR 0020: OAuth and join-link authentication

**Status**: Accepted

**Date**: 2026-10-15

## Context

Coordinators and volunteers need to sign in without SMS cost and without
storing passwords. Cities must stay closed: a person should not see elders
or days until a coordinator admits them.

WhatsApp is how coordinators already share information. A shareable join
link fits that habit. A link that expires in 48 hours or can be used only
once is easy to lose in a group chat; coordinators need one stable URL
per city and role that they can keep posting. Access still must not be
granted by the link alone.

The PWA should be installable from the join landing page and at the end
of onboarding. Apple Sign In needs a paid Apple developer account and is
deferred.

This ADR does not implement auth. It records the product decision for
[docs/rbac.md](../rbac.md) and [docs/data-model.md](../data-model.md).

## Decision

**Login is OAuth only in MVP: Google and Facebook.** Each successful
login creates or links a `User` and an `AuthIdentity`. One user may link
several providers. `apple` exists on the enum for later.

**Onboarding is mandatory** and blocks the rest of the app while
`onboardedAt` is null:

- Required: `firstName`, `lastName`, `phone` (E.164), preferred `locale`.
- Optional: `birthDate`, `email`.
- No `fullName` column. No privacy-acceptance step (`privacyAcceptedAt`
  is not stored).
- After the form: notification permission prompt, then PWA install
  prompt (on iOS, add-to-home-screen instructions).

Elders never log in.

**City access is invite-only:**

- Each city has one **permanent, shareable** `CityInvite` per role
  (`volunteer` or `coordinator`), typically shared on WhatsApp.
- Default: no `expiresAt`, no `maxUses`.
- A coordinator can **revoke** the current link and **regenerate** a new
  token. The old URL stops working.
- The join landing page has an **Install app** button (PWA install
  prompt; iOS add-to-home-screen instructions).
- Redeeming a valid link after login creates a `CityMembership` with
  `status = pending` and the invite's role.
- A coordinator **approves with one tap**. Approval is always required,
  including for coordinator-role links, so a leaked link cannot grant
  access.
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
- One stable WhatsApp-friendly URL per city and role
- Coordinators can rotate a leaked link without waiting for expiry
- Approval keeps humans in the loop for both volunteer and coordinator
  roles
- Install prompts at join and after onboarding improve PWA adoption

### Negative

- Users without Google or Facebook cannot sign in until Apple or another
  provider is added
- A permanent link stays valid until someone revokes it
- Coordinators must approve every join, including their own peers
- Optional `birthDate` is additional personal data if the user enters it

### Mitigation

- Pending + approve is mandatory even when the link is widely shared
- Revoke and regenerate is the response to a leaked link
- Super admin can seed the first coordinator when a city is created
- Session revocation on membership removal limits leftover access
- `birthDate` is optional and never stored on Elder

## Alternatives considered

### SMS one-time codes

**Rejected for MVP.** Cost and operational complexity. Push and OAuth
are enough for smartphone volunteers.

### Single-use link that expires after 48 hours

**Rejected by owner.** Permanent shareable link per city and role, with
revoke/regenerate and approval still required.

### Auto-approve after a valid link

**Rejected.** A forwarded or screenshotted link would grant city access.
Pending + approve is mandatory.

### Privacy-acceptance checkbox during onboarding

**Rejected by owner.** No `privacyAcceptedAt`; onboarding collects
profile fields only.

### Email magic links only

**Rejected as the sole method.** Coordinators already use WhatsApp and
social login; OAuth plus a WhatsApp-shared invite is simpler.

## Notes

- This is documentation only. No auth code ships in this change.
- Apple Sign In is later.
- Refresh-token storage is hashed (`Session.refreshTokenHash`).
