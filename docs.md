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

---

## Hotfix: Summary Date Binding + Supervisor Log Permissions

**Date:** 2026-04-19

**Decision:** Fixed two production regressions: (1) postgres Date parameter binding crash in summary editor state queries, and (2) supervisor startup permission failures under non-root runtime.

**Status:** Implemented

**Incident Symptoms:**
- `Auto summarize complete` followed by `SUMMARY_EDITOR_STATE_FAILED`.
- Runtime error from postgres client: `ERR_INVALID_ARG_TYPE` when binding `Date` values.
- Container startup failure with `PermissionError` for `/var/log/supervisord.log` under non-root setup.

**Root Causes:**
1. Raw `Date` objects were injected into SQL template bindings in summary-state query helpers; postgres client expected string/buffer-serializable input in this path.
2. Supervisor main logfile path was not writable with the non-root runtime configuration in deployed environments.

**Fixes Applied:**
1. `tkg.ts`
   - Converted summary timestamp SQL bindings to ISO strings:
     - `options.after.toISOString()`
     - `sinceDate.toISOString()`
   - Preserved safe timestamp normalization and recovery behavior.
2. `supervisord.conf`
   - Switched supervisor logfile target away from `/var/log/...` to writable runtime paths.
   - Kept process-level non-root execution intent while preventing logger path permission crashes.
3. `.github/workflows/ci.yml`
   - Updated deployment compose template to include explicit runtime/user/env alignment for logger auth and startup behavior.

**Validation:**
- `bunx tsc --noEmit -p apps/api/tsconfig.json`
- `bunx tsc --noEmit -p apps/web/tsconfig.json`
- Docker image build succeeded with hotfix content.
- Production hot-patch verification:
  - API health endpoint returned `200`.
  - Logger dashboard auth endpoint returned `200` with credentials.
  - No recurrence of `SUMMARY_EDITOR_STATE_FAILED` or Date bind type error in recent logs.

**Related Files:**
- `apps/api/src/services/tkg.ts`
- `supervisord.conf`
- `.github/workflows/ci.yml`

---

## Summary Source Correction: Rolling Window over TKG Facts

**Date:** 2026-04-19

**Decision:** Corrected summary editor auto actions to summarize the rolling conversation window (messages) instead of summarizing only existing TKG facts.

**Status:** Implemented

**Problem:**
- The summary editor auto flow previously called TKG fact summarization.
- This was semantically wrong for user intent: summarizing facts only re-compresses what is already extracted, rather than summarizing the current conversation window.

**Fix Applied:**
1. Added rolling-window summarization pipeline in `tkg.ts`:
   - loads recent conversation messages (`ROLLING_WINDOW_MESSAGE_LIMIT`)
   - full mode summarizes the current rolling transcript
   - delta mode incrementally updates previous summary from messages newer than summary watermark
2. Added conversation-based summarization prompts in `tkg-prompts.ts` for full and incremental message summarization.
3. Switched route `/chat/conversations/:id/summary-editor/auto` to call rolling-window summarization service.
4. Updated summary editor helper copy in UI to reflect message-window behavior.

**Resulting Semantics:**
- `Auto Summary (As far as possible)` => summarize rolling conversation transcript.
- `Auto Summary (Since last updated)` => update summary from message deltas since last summary update.
- TKG remains canonical for graph facts and context layering, but is no longer incorrectly used as the source for summary-editor auto generation.

**Related Files:**
- `apps/api/src/services/tkg.ts`
- `apps/api/src/services/tkg-prompts.ts`
- `apps/api/src/routes/chat.ts`
- `apps/web/src/components/Layout/ModelRail.tsx`

---

## Model Parameter Pipeline Hardening (Rail -> Payload -> LLM)

**Date:** 2026-04-19

**Decision:** Reworked model-parameter handling so rail controls are first-class runtime inputs (not decorative), propagate immediately to chat requests, and are mapped to actual provider options used by `streamText`.

**Status:** Implemented

**Problem Signal:**
- Parameter controls in right rail could appear to change but not reliably affect live generation.
- Sampling config persistence had stale-state risk during rapid slider updates.
- Existing penalty control was semantically ambiguous (`repPenalty`) and lacked complete provider coverage.

**Implemented Frontend Changes:**
1. Introduced shared model-config module in `apps/web/src/lib/model-config.ts`:
   - canonical defaults
   - numeric limits and clamping
   - storage helpers
   - migration handling from legacy `repPenalty`
   - model-config update event (`chatty:model-config-updated`)
2. Refactored `ModelRail` local config state to avoid stale closure writes:
   - state + ref synchronization
   - sanitized writes on every update
   - explicit runtime notification to active chat hook
3. Expanded sampling controls to full, explicit knobs:
   - `temperature`
   - `topP`
   - `maxTokens`
   - `frequencyPenalty`
   - `presencePenalty`
4. Updated `useChat` request assembly:
   - subscribes to model-config updates
   - uses latest config via ref at send-time
   - always includes numeric sampling values in outbound message payload

**Implemented Backend Changes:**
1. Extended chat route request schema to accept:
   - `frequencyPenalty`
   - `presencePenalty`
   - retained `repPenalty` as backward-compatible alias
2. Updated stream option assembly to map payload parameters directly to provider options:
   - `frequencyPenalty` (or legacy `repPenalty` fallback)
   - `presencePenalty`
3. Enhanced LLM stream init logs with full sampling fields for observability.

**Why this is better:**
- Eliminates UI-only/decorative parameter behavior.
- Removes stale localStorage write patterns that can silently drop user choices.
- Aligns frontend terms with actual provider controls and preserves backward compatibility.
- Improves traceability: logs now reflect the exact generation knobs passed to the model.

**Validation:**
- `bunx tsc --noEmit -p apps/web/tsconfig.json`
- `bunx tsc --noEmit -p apps/api/tsconfig.json`

**Related Files:**
- `apps/web/src/lib/model-config.ts`
- `apps/web/src/hooks/useChat.ts`
- `apps/web/src/components/Layout/ModelRail.tsx`
- `apps/web/src/lib/types.ts`
- `apps/web/src/lib/api.ts`
- `apps/api/src/routes/chat.ts`

---

## Mobile Tri-Rail Interaction Fix (Sidebar/Rail Collision)

**Date:** 2026-04-20

**Decision:** Refactored mobile panel behavior so context sidebar and model rail behave as mutually exclusive overlays with independent backdrops, preventing toggle button dead-zones and blocked collapse actions.

**Status:** Implemented

**Problem Signal:**
- On mobile, opening both side panels could block header controls.
- Users could reach a state where collapse buttons were visually present but not clickable due to panel overlap and z-index conflicts.

**Implemented Changes:**
1. Added shared layout event contract in `apps/web/src/lib/layout-events.ts`:
   - `toggle` and explicit `set` events for both sidebar and model rail
   - shared mobile media-query constant
2. Updated sidebar state management in `apps/web/src/hooks/useLayout.ts`:
   - supports explicit open/close events
   - auto-closes model rail when opening sidebar on mobile
3. Updated model rail state management in `apps/web/src/components/Layout/ModelRail.tsx`:
   - supports explicit open/close events
   - auto-closes context sidebar when opening model rail on mobile
4. Converted side panels from inline width/opacity styles to class-driven open/closed states:
   - `ContextSidebar` + `HomeSidebar` + `CharacterSidebar`
   - `ModelRail`
5. Added mobile backdrops for both panels with deterministic layering:
   - tap outside closes active panel
   - hidden panel has `pointer-events: none`
6. Unified mobile rail width via root CSS variable and server-rail sizing:
   - avoids hard-coded width drift between rail and overlay offsets
7. Applied small mobile header/content spacing fixes for chat/home screens.

**Why this is better:**
- Eliminates panel overlap deadlocks by design (single active side overlay on mobile).
- Prevents invisible layer interception through strict pointer-event gating.
- Makes panel behavior explicit and debuggable via shared event semantics.

**Validation:**
- `bunx tsc --noEmit -p apps/web/tsconfig.json`

**Related Files:**
- `apps/web/src/lib/layout-events.ts`
- `apps/web/src/hooks/useLayout.ts`
- `apps/web/src/components/Layout/ContextSidebar.tsx`
- `apps/web/src/components/Layout/HomeSidebar.tsx`
- `apps/web/src/components/Layout/CharacterSidebar.tsx`
- `apps/web/src/components/Layout/ContextSidebar.module.css`
- `apps/web/src/components/Layout/ModelRail.tsx`
- `apps/web/src/components/Layout/ModelRail.module.css`
- `apps/web/src/components/Layout/ServerRail.module.css`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/CharacterHeader.tsx`
- `apps/web/src/components/CharacterHeader.module.css`
- `apps/web/src/app/chat/chat.module.css`
- `apps/web/src/app/home/home.module.css`

---

## Legacy repPenalty Migration Correction

**Date:** 2026-04-20

**Decision:** Adjusted legacy config migration so old default `repPenalty: 1.1` is treated as unset when mapping to new `frequencyPenalty`.

**Status:** Implemented

**Problem Signal:**
- Previous migration mapped `repPenalty` directly into `frequencyPenalty`.
- Old UI persisted default `repPenalty: 1.1` in storage even when users never changed it.
- Result: some users were unintentionally migrated to non-zero `frequencyPenalty`.

**Fix Applied:**
1. Added legacy migration guard in `model-config.ts`:
   - if explicit `frequencyPenalty` exists, it wins
   - else legacy `repPenalty` only migrates when it differs from legacy default `1.1`
   - legacy default now falls back to new default `frequencyPenalty: 0`
2. Added epsilon-based comparison for float safety around the legacy default value.

**Why this is better:**
- Prevents silent behavior changes for users who never customized penalty.
- Preserves intentional custom legacy values.
- Maintains forward compatibility with explicit new-format config.

**Validation:**
- `bunx tsc --noEmit -p apps/web/tsconfig.json`

**Related Files:**
- `apps/web/src/lib/model-config.ts`
