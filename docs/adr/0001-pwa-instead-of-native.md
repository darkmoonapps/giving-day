# ADR 0001: PWA Instead of Native Store Apps

**Status**: Accepted

**Date**: 2026-10-13

## Context

The Giving Day application needs to be accessible to volunteers primarily on mobile devices, with admin access on both web and mobile. We need to decide between:

1. Building separate native iOS and Android apps distributed via app stores
2. Building a Progressive Web App (PWA) that works across all platforms
3. Building a web app only without PWA features

**Constraints**:

- Small team with limited development resources
- Need to support both mobile volunteers and web-based admin dashboard
- Want to minimize maintenance burden
- Need to reach users quickly without app store delays

## Decision

We will build a **Progressive Web App (PWA)** that works across web browsers on desktop and mobile, with the option to wrap it with Capacitor later if native app store distribution becomes necessary.

## Consequences

### Positive

- **Single codebase** for all platforms reduces development and maintenance effort
- **No app store approval delays** - updates deploy immediately to all users
- **Lower barrier to entry** - volunteers can access via URL without installing from app store
- **Consistent experience** across web and mobile
- **Future flexibility** - Can wrap with Capacitor to create native apps if requirements change
- **Push notifications** - Available via service workers on Android and modern iOS
- **Offline capability** - Service workers enable offline-first functionality

### Negative

- **iOS home screen installation** less discoverable than App Store presence
- **iOS push notification limitations** (requires adding to home screen on older iOS versions)
- **Reduced native capability access** compared to full native apps (though Capacitor can bridge this gap)
- **Perception** - Some users may perceive PWAs as less "official" than App Store apps

### Mitigation Strategies

- Provide clear instructions for "Add to Home Screen" on iOS
- If push notification adoption is low, consider Capacitor wrapper for native app store presence
- Design UI to feel app-like, not web-page-like
- Use app manifest for proper branding and splash screens

## Alternatives Considered

### Native Apps (iOS + Android)

**Rejected**: Would require maintaining two separate codebases (or React Native with its own complexity), slower development cycle, app store approval delays, and significant overhead for a small team.

### Web-Only (No PWA Features)

**Rejected**: Would sacrifice mobile experience quality, no offline capability, no home screen presence, no push notifications - all critical for volunteer engagement.

### React Native

**Rejected**: While it provides a single codebase for mobile, it still requires separate web implementation for admin dashboard, doesn't reduce complexity enough, and has its own ecosystem challenges.

## Notes

- Capacitor can be added later without major architectural changes if native app store distribution becomes a requirement
- PWA features are progressive enhancement - the app will still work in browsers that don't support service workers
- Target modern browsers: last 2 versions of Chrome, Firefox, Safari, Edge
