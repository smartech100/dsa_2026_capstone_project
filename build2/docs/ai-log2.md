# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)
- **What I asked:** Build 2 in plain JavaScript (ES modules, Node 22.13+, no outside packages): stable `mergeSort`, `publishEvent` / `listEventSummaries`, pure `eventSearch` (filter / sort / search), `node:test` coverage for S02–S06, and an `npm test` script. Use Gambian currency and Gambian cities. Do not break what already works.
- **What came back:** `src/domain/sorting.js`, `src/domain/eventSearch.js`, inventory updates for drafts / publish / unpublish / summaries / pending bookings, tests, `npm test`, and a demo using Gambian places and bututs (stored in `*Cents` fields).
- **What was wrong (or "nothing"):** Too many sample cities (Brikama, Bakau, Fajara, Kololi, …). Trimmed to only Banjul and Serekunda. Tests were first split as S02–S06 story files; reorganised into `ids.test.js`, `inventory.test.js`, `queue.test.js`, and `sorting.test.js` only.

### Prompt 2: Localise and tidy tests
- **What I asked:** Keep only two cities; keep only `ids.test.js`, `inventory.test.js`, `queue.test.js`, and `sorting.test.js`, and remove the other test files.
- **What came back:** All fixtures limited to Banjul and Serekunda; story tests folded into the four module test files; old `s0x-*.test.js` files deleted; `npm test` still green.
- **What was wrong (or "nothing"):** Nothing further on that pass — suite stayed at 39 passing tests.
