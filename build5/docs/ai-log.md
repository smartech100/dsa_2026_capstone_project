# AI log — Build 4

### Prompt: Build 4 working REST API
- **What I asked:** Add the asynchronous in-memory repository, injected services, mock payment gateway, REST endpoints, API examples, and real-server `node:test` coverage while preserving the Build 3 domain and HTTP behavior.
- **What came back:** The isolated `build4` project gained the repository/service/API layers and end-to-end tests for event creation, publishing, event search, booking, payment, and cancellation.
- **What was wrong (or "nothing"):** Review caught that the existing `assertValid` helper cannot set custom error codes, so `INVALID_STATE` paths now throw `DomainError` directly. The first cancellation test matched other fixtures with the same title, so its event was given a unique title. More importantly, the shared state machine allows paid-to-cancelled transitions for later builds; Build 4 must reject paid cancellations, so the service now enforces pending-only cancellation before applying the state-machine transition. The Build 2 S04 criteria also include unpublishing, so an organizer-only unpublish route was added even though the endpoint list named only publish. Tests verify declined payments leave bookings pending and that card data never reaches the gateway. The full test suite passes after these fixes.

# AI log — Build 5

### Prompt 1: move to SQLite and reproduce the overselling problem
- **What I asked:** Add a SQLite-backed repository without changing the services, persist server data, seed the database, and run 50 simultaneous attempts for the last ticket.
- **What came back:** Build 5 now uses `node:sqlite`, includes constrained tables and a placeholder-based repository, and the server opens the persistent database. The isolated demo produced 50 successful requests and 99 bookings for a 50-seat tier; the stored `sold` counter is 50 because the concurrent writes overwrite each other.
- **What was wrong (or "nothing"):** The first demo output counted only seats in the 50 racing requests, which obscured that the preceding 49 seats were already booked. It now reports the pre-race availability, total seats represented by bookings, and the stored tier counter separately. No atomic reservation was added because this prompt is the reproduction stage; fixing the race is Prompt 2.
