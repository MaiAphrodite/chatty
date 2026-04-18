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
