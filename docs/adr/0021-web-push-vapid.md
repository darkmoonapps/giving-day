# ADR 0021: Provider-agnostic Web Push (VAPID)

**Status**: Accepted

**Date**: 2026-10-28

## Context

Distribution-day announce, reminders, and membership approval need push
notifications on the PWA. The PRD left the vendor open (FCM, OneSignal, or
native APIs). Paid vendors and credit-card accounts are out of scope
(ADR 0018). Keys must not be committed (ADR 0007).

## Decision

- The API talks to a **`NotificationProvider`** interface. Production uses
  the W3C **Web Push** protocol with **VAPID** keys from env
  (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- When those keys are missing, a **log/no-op provider** is used so
  development and tests never call a network. Opening a day still writes
  `NotificationLog` rows.
- `PushSubscription` rows store the browser endpoint and keys. A 404/410
  from the push service disables that row. Fan-out of `day_invite` goes to
  the city's **active volunteers** and is deduped with
  `NotificationLog.dedupeKey`.
- No Firebase, OneSignal, or other paid push product.

## Consequences

### Positive

- Zero-cost, standards-based push that works for an installed PWA
- Tests and local dev do not need real VAPID keys
- A later SMS/WhatsApp channel can implement the same interface

### Negative

- iOS Web Push only works after add-to-home-screen on supported versions
- Operators must generate and store VAPID keys themselves

### Mitigation

- Document key generation in `.env.example` and deployment docs
- Keep the public key available to signed-in clients via
  `GET /api/push-subscriptions/vapid-public-key`
