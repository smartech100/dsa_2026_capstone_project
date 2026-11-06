# AI log — Build 3

### Prompt: Build 3 architecture, state machine and server skeleton
- **What I asked:** Add the Build 3 Mermaid architecture and data-flow diagrams, a tested booking state machine, a small HTTP router/server, static files, configuration and a start command without changing existing domain behavior.
- **What came back:** `docs/architecture.md`, `src/domain/bookingStateMachine.js`, `src/http/`, `src/config.js`, `src/server.js`, `public/index.html`, and focused `node:test` coverage.
- **What was wrong (or "nothing"):** No existing domain behavior needed changing; the server keeps business rules out of routes and does not send stack traces in error responses.
