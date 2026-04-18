# Project Decision Log

## DatabaseIcon and MessagesSquareIcon Addition

**Date:** 2026-04-18

**Decision:** Added DatabaseIcon and MessagesSquareIcon components to the Icons.tsx file and updated ModelRail.tsx to use these specific icons instead of the generic Icon component.

**Changes Made:**
1. Added DatabaseIcon and MessagesSquareIcon components to `/apps/web/src/components/ui/Icons.tsx`
2. Updated ModelRail.tsx to import these icons from "@/components/ui/Icons"
3. Replaced the generic `<Icon name="Database" />` and `<Icon name="MessagesSquare" />` with the specific `<DatabaseIcon />` and `<MessagesSquareIcon />` components

**Reasoning:**
- The generic Icon component pattern was not being used consistently in the codebase
- Specific icon components provide better type safety and IDE autocompletion
- This approach eliminates the need for a switch/lookup pattern in a generic Icon component
- Makes the code more explicit about which icons are being used

**Alternatives Considered:**
1. Keep the generic Icon component and add the missing icon definitions - rejected because the generic pattern was not being used elsewhere
2. Create a separate icons index file - rejected as over-engineering for this use case

**Related Files:**
- `/apps/web/src/components/ui/Icons.tsx`
- `/apps/web/src/components/Layout/ModelRail.tsx`

## Fix Memory UI Layout in ModelRail

**Date:** 2026-04-18

**Decision:** Fixed memory component layout to match intended design.

**Changes Made:**
1. Moved "Summarize" button from Knowledge Graph section to Context Window section (below textbox)
2. Increased context textarea rows from 3 to 4
3. Updated button text to "Compress to Summary" for clarity
4. Fixed button disabled condition

**Reasoning:**
- Summarizes the sliding window memory (context), not individual facts
- Context textbox should be visually grouped with stats and summarize action
- Knowledge Graph should only contain individual facts

**Related Files:**
- `apps/web/src/components/Layout/ModelRail.tsx`

---

## Add memoryMode to /characters/mine Endpoint

**Date:** 2026-04-18

**Decision:** Added `memoryMode` column to `/characters/mine` endpoint for consistency with `/characters/:id`.

**Changes Made:**
1. Added `memoryMode: true` to columns in `apps/api/src/routes/character.ts` line 95

**Reasoning:**
- Endpoint `/characters/mine` was missing `memoryMode` while `/characters/:id` includes it
- Ensures consistency across API responses for character data
- Required for "My Characters" list to include all character properties

**Related Files:**
- `apps/api/src/routes/character.ts`

---

## TKG Memory Scoping and Message Variants Integration

**Date:** 2026-04-18

**Decision:** Implemented Temporal Knowledge Graph (TKG) memory hooks and message iteration variants to ensure conversation-level memory isolation and allow users to seamlessly swipe through regenerated messages without losing context.

**Changes Made:**
1. Extended `useChat.ts` and `api.ts` to support specific TKG endpoints (`getContextStats`, `summarizeMemory`, `getMemories`, `add/update/deleteMemory`).
2. Added `regenerateMessage` and `swipeVariant` to `useChat.ts` state management, allowing non-destructive message regeneration.
3. Updated message components (`MessageRow`) and layout structures (`ModelRail`, `UserSettingsModal`) to accommodate the new variant swiping interface and model settings.
4. Added `logger.ts` and `provider.ts` backend services for strict execution logging and provider management.

**Reasoning:**
- Ensuring TKG extracts facts cleanly without corrupting the context window requires segmented API interactions.
- Destructive generation undermines user trust; preserving past variants allows for safer exploration using different LLM parameters.
- Exposing model configuration properly gives users fine-grained control to tweak extraction and retrieval behaviors.

**Alternatives Considered:**
1. Mutating previous messages inline - rejected because it violates immutability and strips user history.
2. Handling TKG entirely in the frontend - rejected due to the risk of oversized unmanageable JSON state and lack of robust querying.

**Related Files:**
- `/apps/web/src/hooks/useChat.ts`
- `/apps/web/src/lib/api.ts`
- `/apps/web/src/components/MessageRow.tsx`
- `/apps/web/src/components/UserSettingsModal.tsx`

---

## Summary Editor + Layered Memory Injection

**Date:** 2026-04-19

**Decision:** Implemented a dedicated summary editor modal and switched memory injection to a layered strategy: inject summary first, then inject only post-summary TKG deltas.

**Status:** Implemented

**Why this was chosen:**
- Inline read-only textbox plus single summarize button could not support explicit summary editing.
- Concatenating full summary plus full graph wastes tokens and increases contradiction risk.
- Layered summary plus delta-facts preserves coherence and recency without mutating canonical graph facts.

**Implemented Backend Changes:**
1. Added summary editor APIs in `chat` routes:
   - `GET /chat/conversations/:id/summary-editor`
   - `POST /chat/conversations/:id/summary-editor/auto` with `mode: "delta" | "full"`
   - `PUT /chat/conversations/:id/summary-editor`
2. Added summary services in `tkg.ts`:
   - `getSummaryEditorState`
   - `autoSummarizeMemory` (delta/full)
   - `saveManualSummary`
3. Updated memory context assembly:
   - Summary block budgeted first (`SUMMARY_BUDGET_RATIO`)
   - Recent updates packed from facts newer than `summary.updatedAt`
   - Emits structured sections: `Long-term summary` and `Recent updates`
4. Added observability fields in TKG logs for memory composition:
   - `summaryTokens`, `deltaTokens`, `deltaFactCount`, `droppedFactCount`
5. Tightened conversation scoping for memory and summary endpoints with shared route-level conversation lookup.

**Implemented Frontend Changes:**
1. Replaced inline summarize action with `Summary Editor` modal flow in `ModelRail`.
2. Added modal UX matching requested behavior:
   - Header plus helper text plus recency metadata
   - Editable summary textarea
   - `Auto Summary (Since last updated)` (delta)
   - `Auto Summary (As far as possible)` (full)
   - `Cancel` and `Save Summary`
3. Added API client methods and shared types for summary editor state.
4. Kept `chatty:memory-updated` event propagation to refresh rail data after auto and manual save actions.

**Guardrails Preserved:**
- TKG edges remain canonical source of truth.
- Manual summary edits do not write back into graph edges.
- Empty summary saves are rejected at API level.

**Declutter Note:**
- Consolidated prior proposal-only entries into this implemented ADR entry.

**Related Files:**
- `apps/api/src/routes/chat.ts`
- `apps/api/src/services/tkg.ts`
- `apps/api/src/services/tkg-prompts.ts`
- `apps/web/src/components/Layout/ModelRail.tsx`
- `apps/web/src/components/Layout/ModelRail.module.css`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/types.ts`

---

## Summary Endpoint 500 Hardening + Deployment Reliability

**Date:** 2026-04-19

**Decision:** Added defensive timestamp normalization, route-level unknown-error capture, and a migration-gated container startup flow to prevent summary editor 500s and startup race failures in production.

**Status:** Implemented

**Incident Signal:**
- Production reported `Request failed (500)` when opening summary editor.
- API logs showed TKG summarize completion but UI still failed, indicating runtime path instability around summary state fetch or unhandled route exceptions.

**Implemented Backend Hardening:**
1. Normalized timestamp/number handling in `tkg.ts` for summary and delta calculations:
   - Added safe converters for `Date | string | number | null` values.
   - Removed brittle direct date operations in delta sorting/filtering and summary state serialization.
2. Added fail-safe behavior:
   - `getSummaryEditorState` now catches internal failures, logs context, and returns an empty safe state instead of surfacing a 500.
   - `buildMemoryContext` now catches failures and falls back to edge-packed context.
3. Added centralized unknown-error capture in chat routes:
   - Logs route path + error payload and returns controlled `500` response body.

**Implemented Docker/Deploy Hardening:**
1. Added `docker/entrypoint.sh`:
   - Runs DB deploy migrations before launching supervisor.
   - Retries migration with configurable attempts and delay.
   - Fails fast if migration never succeeds.
2. Updated `Dockerfile`:
   - Uses entrypoint bootstrap script instead of directly launching supervisor.
   - Adds migration retry env defaults.
3. Updated `docker-compose.yml`:
   - Added Postgres healthcheck (`pg_isready`).
   - Gated app startup on healthy DB.
   - Added migration retry environment variables.
4. Updated `.dockerignore`:
   - Excluded `apps/web/tsconfig.tsbuildinfo` to avoid noisy build-context artifacts.

**Why this is safer:**
- Prevents timestamp shape drift from crashing summary APIs at runtime.
- Makes unknown route exceptions observable and non-silent.
- Ensures containers do not boot app services before schema is ready.

**Validation:**
- `bunx tsc --noEmit -p apps/api/tsconfig.json`
- `bunx tsc --noEmit -p apps/web/tsconfig.json`

**Related Files:**
- `apps/api/src/services/tkg.ts`
- `apps/api/src/routes/chat.ts`
- `Dockerfile`
- `docker-compose.yml`
- `docker/entrypoint.sh`
- `.dockerignore`

---

## AGENTS.md Compliance Audit (Summary + Deploy Hardening)

**Date:** 2026-04-19

**Decision:** Performed explicit compliance review against `AGENTS.md` principles after summary endpoint hardening.

**Status:** Partially compliant; remediation backlog identified.

**Compliant Areas:**
- Added architecture-level resilience for startup sequencing (DB healthcheck + migration gating).
- Improved observability with structured route/TKG error logs.
- Updated project decision log with ADR-style entries.

**Non-Compliant / At-Risk Areas:**
1. Function size and single responsibility are still violated in key modules (`chat.ts`, `tkg.ts`).
2. Fail-fast principle is partially violated by fail-open fallbacks that can hide data corruption (`getSummaryEditorState`, `getMemorySummaries`).
3. Docker runtime security posture remains weak (single all-in-one container running as root).
4. Scalability risk remains in full in-memory delta fact sorting without SQL-side caps/filters.

**Planned Remediation:**
1. Refactor summary/memory services into smaller pure helpers (<=30 lines where practical).
2. Add typed error boundaries (`recoverable` vs `fatal`) and explicit API error codes.
3. Split service processes and run containers with non-root users where feasible.
4. Push delta filtering/ranking constraints further into SQL and add integration tests for summary routes.

**Related Files:**
- `apps/api/src/services/tkg.ts`
- `apps/api/src/routes/chat.ts`
- `Dockerfile`
- `docker-compose.yml`

---

## AGENTS.md Compliance Remediation Pass

**Date:** 2026-04-19

**Decision:** Applied a remediation refactor to improve adherence to AGENTS constraints (SRP, fail-fast clarity, observability, security posture) without changing product behavior.

**Status:** Implemented

**Remediations Completed:**
1. Refactored route and service logic into smaller focused helpers:
   - conversation scope resolution helpers in `chat.ts`
   - summary/context helper decomposition in `tkg.ts`
2. Improved fail-fast semantics with explicit typed service errors:
   - introduced `TkgServiceError` and `RecoverableTkgError`
   - added contextual error codes for summary and memory context failures
3. Reduced scalability risk in delta retrieval path:
   - moved `updatedAt` filtering into SQL path
   - added bounded delta edge retrieval (`MAX_DELTA_FACTS`)
4. Improved runtime security posture of container:
   - added non-root `chatty` user in Docker image
   - removed root pin from supervisor config
   - ensured app directory ownership for runtime writes
5. Preserved migration-gated startup reliability:
   - entrypoint migration retries remain before app process launch

**Verification:**
- `bunx tsc --noEmit -p apps/api/tsconfig.json`
- `bunx tsc --noEmit -p apps/web/tsconfig.json`
- `bash -n docker/entrypoint.sh`
- `docker build -t chatty:agents-compliance-test .`

**Remaining Known Gaps:**
- Full <=30-line function compliance across legacy modules is improved but not complete in all pre-existing code paths.
- Further decomposition of `chat.ts` and extraction heuristics in `tkg.ts` is recommended for strict conformity.

**Related Files:**
- `apps/api/src/routes/chat.ts`
- `apps/api/src/services/tkg.ts`
- `Dockerfile`
- `supervisord.conf`
- `docker/entrypoint.sh`
- `docker-compose.yml`

---

## Strict Compliance + Authenticated Logger Hardening

**Date:** 2026-04-19

**Decision:** Added authenticated access control for logger dashboard/stream and completed strict function-size compliance for touched backend modules while preserving behavior.

**Status:** Implemented

**Implemented Changes:**
1. Logger authentication and auditing:
   - Added HTTP Basic auth guard for logger dashboard (`/`) and stream (`/stream`).
   - Default credentials wired via env: `admin` / `chatty123`.
   - Added detailed request metadata logging for authorized and unauthorized attempts.
2. Logger service refactor for strict SRP:
   - Split stream/dashboard handling into focused helper methods.
   - Added isolated response builders and SSE emitter helpers.
3. Strict function-size compliance pass:
   - Refactored oversized top-level functions in `tkg.ts` and `chat.ts` into smaller helpers.
   - Re-validated no >30-line top-level functions in touched files.
4. Detailed startup logging:
   - Added startup log indicating logger auth initialization settings.

**Configuration Defaults:**
- `LOGGER_DASHBOARD_USER=admin`
- `LOGGER_DASHBOARD_PASSWORD=chatty123`

**Validation:**
- `bunx tsc --noEmit -p apps/api/tsconfig.json`
- `bunx tsc --noEmit -p apps/web/tsconfig.json`
- `bash -n docker/entrypoint.sh`
- `docker build -t chatty:strict-compliance-auth-logger .`
- Static compliance scan confirmed no oversized top-level functions in:
  - `apps/api/src/services/tkg.ts`
  - `apps/api/src/routes/chat.ts`
  - `apps/api/src/services/logger.ts`

**Security Note:**
- Defaults are intentionally explicit per request; production deployment should override password via environment secret management.

**Related Files:**
- `apps/api/src/services/logger.ts`
- `apps/api/src/services/tkg.ts`
- `apps/api/src/routes/chat.ts`
- `apps/api/src/index.ts`
- `Dockerfile`
- `docker-compose.yml`
