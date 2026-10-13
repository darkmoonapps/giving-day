# ADR 0005: REST + Server-Sent Events, No WebSockets

**Status**: Accepted

**Date**: 2026-10-13

## Context

The application needs:

- Standard CRUD operations for volunteers, elders, and distribution days
- Real-time updates for admin dashboard (confirmation status changes)
- One-way server-to-client updates (push notifications are out-of-band)

We need to decide on the communication protocol between frontend and backend.

## Decision

Use **REST APIs** for all standard operations (CRUD, auth, actions) and **Server-Sent Events (SSE)** for real-time updates to the admin dashboard. Do not implement WebSockets.

## Consequences

### REST APIs

**Positive**:

- **Standard HTTP** - Works everywhere, no special infrastructure
- **Cacheable** - Can use HTTP caching where appropriate
- **Stateless** - Easier to scale horizontally
- **Well understood** - Team familiarity, abundant tooling
- **Simple debugging** - Browser DevTools, Postman, curl

**Negative**:

- Not real-time by default (requires SSE for live updates)

### Server-Sent Events (SSE)

**Positive**:

- **One-way updates** - Perfect for dashboard updates (server → client)
- **Built into browsers** - `EventSource` API, no library needed
- **Simpler than WebSockets** - Less overhead, easier to implement
- **Auto-reconnect** - Browser handles reconnection automatically
- **Works over HTTP** - No special infrastructure, works with standard load balancers
- **Easier to debug** - Plain HTTP events visible in DevTools

**Negative**:

- One-way only (client can't send over SSE channel, must use separate HTTP requests)
- Connection limit per domain in some browsers (6 concurrent connections in Chrome)
- Less browser support than WebSockets (but supported in all modern browsers)

### No WebSockets

**Reasoning**:

- **Overkill for our use case** - We don't need bidirectional real-time communication
- **Infrastructure complexity** - Requires sticky sessions or Redis adapter for horizontal scaling
- **More moving parts** - Socket.io or ws library, connection management, reconnection logic
- **Debugging complexity** - Harder to inspect than HTTP requests

## Alternatives Considered

### GraphQL + Subscriptions

**Rejected**: GraphQL adds complexity for what's primarily a CRUD app. REST is simpler and sufficient. GraphQL subscriptions require WebSockets or SSE anyway, so no advantage for real-time features.

### WebSockets

**Rejected**: While WebSockets enable bidirectional communication, we don't need it. Admin dashboard only needs to _receive_ updates, not send real-time commands. Regular HTTP requests suffice for user actions.

### Polling

**Rejected**: Client periodically fetching updates is inefficient and increases server load. SSE provides true push without the overhead of constant polling.

### Long Polling

**Rejected**: More complex than SSE, similar downsides to polling, no advantage over SSE in modern browsers.

### Firebase Realtime Database / Supabase Realtime

**Rejected**: Would lock us into a specific BaaS platform. We want control over our API and database.

## Implementation Details

### REST Endpoints (Examples)

```
POST   /api/auth/login
GET    /api/volunteers
POST   /api/volunteers
GET    /api/volunteers/:id
PATCH  /api/volunteers/:id
DELETE /api/volunteers/:id

GET    /api/distribution-days
POST   /api/distribution-days
GET    /api/distribution-days/:id

POST   /api/confirmations/:id/confirm
POST   /api/confirmations/:id/decline
```

### SSE Endpoint

```
GET /api/events/distribution-day/:id
```

Streams events like:

- `volunteer-confirmed`
- `volunteer-declined`
- `volunteer-reminded`
- `elder-unassigned`

### Client Pattern

```typescript
// Standard REST calls for actions
await fetch('/api/confirmations/123/confirm', { method: 'POST' });

// SSE for dashboard updates
const eventSource = new EventSource('/api/events/distribution-day/456');
eventSource.addEventListener('volunteer-confirmed', (event) => {
  updateDashboard(JSON.parse(event.data));
});
```

## Future Considerations

- If we later need bidirectional real-time (e.g., live chat), can add WebSockets for that specific feature
- SSE connection limits can be mitigated by using one connection per dashboard view
- Consider HTTP/2 for better SSE performance (multiplexing)

## Notes

- Use NestJS `@Sse()` decorator for SSE endpoints
- Implement proper error handling and reconnection on client
- Close SSE connections when dashboard view unmounts
- Consider rate limiting on SSE endpoints to prevent abuse
- Use JWT authentication in SSE connection headers
