import { db } from "../db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { tkgEntities, tkgEdges, tkgSummaries } from "../db/tkg-schema";
import { users } from "../db/schema";
import { decryptKey } from "./crypto";
import { Logger } from "./logger";
import { resolveProviderConfig } from "./provider";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  SUMMARIZATION_PROMPT,
  buildSummarizationUserPrompt,
} from "./tkg-prompts";

// ─── Errors ───────────────────────────────────────────────────────────────────



// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractedEntity = { name: string; type: string };
type ExtractedRelationship = { source: string; predicate: string; target: string; confidence?: number };
type ExtractionResult = { entities: ExtractedEntity[]; relationships: ExtractedRelationship[] };

// Reasoning models (R1, o-series, etc.) have a mandatory thinking phase that can
// take 15-40s before any tokens are emitted. Standard models respond in <10s.
const REASONING_MODEL_TIMEOUT_MS = 60_000;
const STANDARD_MODEL_TIMEOUT_MS  = 15_000;
const EXTRACTION_MAX_TOKENS = 500;

const REASONING_MODEL_PATTERNS = /deepseek-reasoner|deepseek-r1|o1|o3|qwq|claude-3-7|gemini-think/i;

function resolveExtractionTimeout(modelId: string): number {
  return REASONING_MODEL_PATTERNS.test(modelId) ? REASONING_MODEL_TIMEOUT_MS : STANDARD_MODEL_TIMEOUT_MS;
}

const MEMORY_TOKEN_BUDGET = 2000;
const SUMMARIZATION_EDGE_THRESHOLD = 50;
const SUMMARIZATION_INCREMENT = 25;

// ─── Heuristic Trigger ────────────────────────────────────────────────────────
//
// Scored signal detection: each category contributes a weight. Extraction fires
// when total score >= EXTRACTION_THRESHOLD. This prevents over-triggering on
// incidental keyword matches while catching natural conversational disclosures.
//
// Checking against both user turn AND assistant turn catches "echo confirmations"
// e.g. assistant says "Oh so you live in Tokyo!" — high signal even if user just
// said "Yeah, Tokyo."

const EXTRACTION_THRESHOLD = 2;

type SignalCategory = { weight: number; patterns: RegExp[] };

const SIGNAL_CATEGORIES: SignalCategory[] = [
  { weight: 3, patterns: [
    /\bmy name(?:'s| is)\b/i,
    /\bpeople call me\b/i,
    /\bi(?:'m| am)\s+\d{1,3}\s*(?:years? old|yo\b)/i,
    /\bborn (?:in|on)\b/i,
    /\bi(?:'m| am)\s+(?:a|an)\s+\w+(?:ist|er|or|ian|ent)\b/i,
  ]},
  { weight: 3, patterns: [
    /\b(?:i |i'm |we )(?:live|moved?|relocated|based|staying|settled|grew up)\b.{0,30}(?:in|at|to|near)\b/i,
    /\b(?:from|born in|hometown(?:'s| is)|originally from)\b/i,
    /\bi(?:'m| am) in\s+[A-Z][a-z]{2,}/,
  ]},
  { weight: 3, patterns: [
    /\bmy\s+(?:wife|husband|partner|boyfriend|girlfriend|fiancé|spouse)\b/i,
    /\bmy\s+(?:mom|dad|mother|father|parents?|sister|brother|sibling|grandma|grandpa|child|son|daughter|baby|kids?)\b/i,
    /\bmy\s+(?:best\s*friend|roommate|colleague|boss|coworker|ex)\b/i,
    /\bi(?:'m| am)\s+(?:single|married|engaged|divorced|widowed|dating)\b/i,
  ]},
  { weight: 2, patterns: [
    /\b(?:i |i'm )(?:work|working|employed|intern|freelance)\b/i,
    /\bmy\s+(?:job|career|major|degree|company|startup|boss|office)\b/i,
    /\bi\s+(?:study|studied|graduated|dropped out|enrolled)\b/i,
    /\b(?:i'm|i am)\s+(?:a\s+)?(?:student|engineer|developer|designer|doctor|nurse|teacher|lawyer|writer|artist)\b/i,
  ]},
  { weight: 2, patterns: [
    // Affirmative preferences
    /\bi\s+(?:do\s+)?(?:also\s+)?(?:really\s+)?(?:love|like|enjoy|prefer|hate|dislike|can't stand|obsessed with)\b/i,
    // Negated preferences: "i don't like", "i no longer enjoy", "i'm not a fan"
    /\bi\s+(?:don'?t|no longer|stopped?|used to)\s+(?:like|love|enjoy|eat|watch|play|use|wear|do)\b/i,
    /\bi'?m\s+(?:not\s+(?:a\s+fan|into)|over|tired of|done with)\b/i,
    /\bthinking back[,.]?\s+i\b/i,
    /\bactually[,.]?\s+i\s+(?:don'?t|no longer|prefer not)\b/i,
    /\bmy\s+(?:favorite|fav|favourite)\b/i,
    /\bi\s+(?:always|never|usually|often)\s+\w/i,
    /\bmy\s+(?:hobbi?es?|passion|interest|routine)\b/i,
    /\bi\s+(?:play|read|watch|listen to|collect|cook|bake|run|cycle|climb|hike)\b/i,
  ]},
  { weight: 2, patterns: [
    /\bi(?:'m| am)\s+(?:trying|planning|hoping|working toward|aiming)\b/i,
    /\bi\s+want to\s+(?:be|become|learn|start|build|move|travel)\b/i,
    /\bmy\s+(?:goal|dream|plan|ambition)\b/i,
  ]},
  { weight: 2, patterns: [
    /\bi(?:'m| am)\s+(?:allergic|vegan|vegetarian|diabetic|pregnant)\b/i,
    /\bi\s+(?:have|had|suffer from|was diagnosed with|dealing with)\b.{0,25}(?:condition|disorder|syndrome|disease|anxiety|depression|adhd|autism)\b/i,
    /\bmy\s+(?:health|diet|medication|doctor|therapist)\b/i,
  ]},
  { weight: 3, patterns: [
    /\b(?:last\s+(?:week|month|year)|yesterday|recently|just)\b.{0,30}\b(?:started|quit|left|joined|moved|broke up|had|lost|won|graduated|married|divorced|bought|sold)\b/i,
    /\bsince\s+(?:\d{4}|last\s+\w+|i\s+was)\b/i,
    /\bi\s+(?:just|recently)\s+\w+ed\b/i,
  ]},
  { weight: 1, patterns: [
    /\bmy\s+(?:cat|dog|pet|fish|bird|hamster|rabbit|horse)\b/i,
    /\bmy\s+(?:car|house|apartment|flat|laptop)\b/i,
  ]},
  { weight: 2, patterns: [
    /\bi(?:'m| am)\s+[A-Z][a-z]+(?:ese|ian|ish|ic|er)\b/,
    /\bmy\s+(?:culture|religion|faith|language|nationality)\b/i,
    /\bi\s+speak\b/i,
  ]},
];

const ASSISTANT_ECHO_PATTERNS: RegExp[] = [
  /\bso you(?:'re| are)\b/i,
  /\byou(?:'re| are)\s+(?:from|based in|living in|working)\b/i,
  /\bgot it[,.]?\s+(?:so\s+)?you\b/i,
  /\bi(?:'ll| will)\s+(?:remember|keep in mind|note)\b/i,
];

function scoreMessage(text: string): number {
  return SIGNAL_CATEGORIES.reduce((total, { weight, patterns }) =>
    total + (patterns.some(p => p.test(text)) ? weight : 0), 0);
}

export function shouldAutoExtract(userMessage: string, assistantMessage?: string): boolean {
  const echoBoost = assistantMessage && ASSISTANT_ECHO_PATTERNS.some(p => p.test(assistantMessage)) ? 1 : 0;
  return (scoreMessage(userMessage) + echoBoost) >= EXTRACTION_THRESHOLD;
}

// ─── Shared Database Queries ──────────────────────────────────────────────────

function fetchActiveCharacterEdges(characterId: string, conversationId: string, userId: string, limitCount?: number) {
  let query = db
    .select({
      id: tkgEdges.id,
      sourceName: tkgEntities.name,
      predicate: tkgEdges.predicate,
      targetName: sql<string>`t2.name`,
    })
    .from(tkgEdges)
    .innerJoin(tkgEntities, eq(tkgEdges.sourceEntityId, tkgEntities.id))
    .innerJoin(sql`tkg_entities t2`, sql`${tkgEdges.targetEntityId} = t2.id`)
    .where(
      and(
        // Note: For v0.2 'chat' mode, this would be `isNull(tkgEdges.conversationId)`
        // For now, we enforce 'roleplay' mode (strict conversation isolation).
        eq(tkgEdges.characterId, characterId),
        eq(tkgEdges.conversationId, conversationId),
        eq(tkgEdges.userId, userId),
        isNull(tkgEdges.validUntil),
      )
    )
    .orderBy(desc(tkgEntities.mentionCount), desc(tkgEntities.lastSeenAt));

  return limitCount ? query.limit(limitCount) : query;
}


// ─── Extraction ───────────────────────────────────────────────────────────────

function stripReasoningTags(text: string): string {
  // DeepSeek-R1 and similar reasoning models wrap chain-of-thought in XML tags.
  // These must be removed before JSON extraction or the regex matches inner braces.
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

function parseExtractionResponse(raw: string): ExtractionResult | null {
  const cleaned = stripReasoningTags(raw);
  // Match the outermost JSON object — use last occurrence to skip any preamble text
  const jsonMatches = [...cleaned.matchAll(/\{[\s\S]*?\}/g)];
  const jsonStr = jsonMatches.length > 0 ? cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1) : null;
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed.entities) || !Array.isArray(parsed.relationships)) return null;
    return {
      entities: parsed.entities.filter((e: unknown) => typeof (e as any)?.name === "string" && (e as any).name.trim().length > 0),
      relationships: parsed.relationships.filter((r: unknown) =>
        typeof (r as any)?.source === "string" && typeof (r as any)?.predicate === "string" && typeof (r as any)?.target === "string"
      ),
    };
  } catch {
    return null;
  }
}

export async function extractFacts(userMessage: string, assistantMessage: string, userId: string): Promise<ExtractionResult | null> {
  Logger.info("TKG", `Initiating auto-extraction for user ${userId.substring(0, 6)}...`);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { llmEndpoint: true, llmApiKey: true, llmModel: true },
  });
  const { baseUrl, apiKey, modelId } = resolveProviderConfig(user);
  const provider = createOpenAI({ baseURL: baseUrl, apiKey, compatibility: "compatible" });
  const controller = new AbortController();
  const timeoutMs = resolveExtractionTimeout(modelId);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await generateText({
      model: provider(modelId),
      system: EXTRACTION_SYSTEM_PROMPT,
      prompt: buildExtractionUserPrompt(userMessage, assistantMessage),
      maxTokens: EXTRACTION_MAX_TOKENS,
      temperature: 0.1,
      abortSignal: controller.signal,
      maxRetries: 0,
    });
    // Reasoning models (deepseek-reasoner, o1, etc.) emit the final answer into
    // result.reasoning and leave result.text empty when the output is pure JSON.
    const rawOutput = result.text || (result as any).reasoning || "";
    const rawParsed = parseExtractionResponse(rawOutput);
    const parsed = rawParsed ? normalizeAndFilter(rawParsed) : null;
    const filteredOut = rawParsed ? rawParsed.relationships.length - (parsed?.relationships.length ?? 0) : 0;
    if (parsed && (parsed.entities.length > 0 || parsed.relationships.length > 0)) {
      Logger.info("TKG", `Extraction found ${parsed.entities.length} entities, ${parsed.relationships.length} edges${filteredOut > 0 ? ` (${filteredOut} filtered)` : ""}`);
    } else {
      // Log raw model output so we can diagnose when parsing silently fails
      Logger.warn("TKG", "Extraction returned no usable facts", {
        rawLength: result.text.length,
        preview: result.text.slice(0, 200),
      });
    }
    return parsed;
  } catch (err) {
    // TKG extraction is a silent background job — provider failures must never
    // surface to the user or crash the main thread. Log full detail and return null.
    const detail = err instanceof Error
      ? { name: err.name, message: err.message, url: baseUrl, model: modelId }
      : { raw: String(err), url: baseUrl, model: modelId };
    Logger.warn("TKG", "Extraction skipped due to provider error", detail);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Graph Upsert ─────────────────────────────────────────────────────────────

async function upsertEntity(characterId: string, conversationId: string, userId: string, entity: ExtractedEntity): Promise<string> {
  const normalizedName = entity.name.trim();

  // Drizzle's onConflictDoUpdate cannot reference functional-index expressions
  // like lower(name). Use an explicit lookup + update-or-insert instead.
  const existing = await db.query.tkgEntities.findFirst({
    where: and(
      eq(tkgEntities.characterId, characterId),
      eq(tkgEntities.conversationId, conversationId),
      eq(tkgEntities.userId, userId),
      sql`lower(${tkgEntities.name}) = lower(${normalizedName})`,
    ),
    columns: { id: true },
  });

  if (existing) {
    await db.update(tkgEntities)
      .set({ mentionCount: sql`${tkgEntities.mentionCount} + 1`, lastSeenAt: new Date() })
      .where(eq(tkgEntities.id, existing.id));
    return existing.id;
  }

  const [row] = await db.insert(tkgEntities)
    .values({ characterId, conversationId, userId, name: normalizedName, entityType: entity.type || "thing" })
    .returning({ id: tkgEntities.id });
  return row.id;
}

// ─── Predicate Canonicalization ──────────────────────────────────────────────
//
// LLMs produce inconsistent predicates regardless of prompt instructions:
// "hated", "does not like", "is not a fan of" are all semantically "dislikes".
// We normalize deterministically here — the LLM just extracts, we canonicalize.

const PREDICATE_CANON_MAP: Record<string, string> = {
  // Affirmative preference
  like: "likes", liked: "likes", love: "likes", loved: "likes", loves: "likes",
  enjoy: "likes", enjoys: "likes", enjoyed: "likes", prefers: "likes",
  prefer: "likes", preferred: "likes", is_fan_of: "likes", is_into: "likes",
  is_fond_of: "likes", likes_eating: "likes", likes_watching: "likes",
  is_obsessed_with: "likes", adores: "likes",

  // Negative preference
  dislike: "dislikes", disliked: "dislikes", hate: "dislikes", hated: "dislikes",
  hates: "dislikes", avoids: "dislikes", avoided: "dislikes",
  does_not_like: "dislikes", no_longer_likes: "dislikes",
  stopped_liking: "dislikes", cant_stand: "dislikes", is_not_a_fan_of: "dislikes",
  is_not_into: "dislikes", used_to_like: "dislikes",
  dislikes_eating: "dislikes", dislikes_watching: "dislikes",

  // Location
  live_in: "lives_in", living_in: "lives_in", located_in: "lives_in",
  based_in: "lives_in", resides_in: "lives_in", residing_in: "lives_in",
  is_from: "lives_in",
  used_to_live_in: "lived_in", formerly_lived_in: "lived_in", moved_from: "lived_in",

  // Work
  work_at: "works_at", working_at: "works_at", employed_at: "works_at",
  employed_by: "works_at", works_for: "works_at",

  // Relationship status
  is_in_relationship_with: "is_dating", dating: "is_dating",
  is_with: "is_dating", goes_out_with: "is_dating", engaged_to: "is_dating",
  married_to: "is_dating", not_dating: "is_single",
};

function canonicalizePredicate(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return PREDICATE_CANON_MAP[key] ?? key;
}

// ─── Relationship Validator ───────────────────────────────────────────────────
//
// Filters garbage relationships from the LLM before they touch the DB.
// Common failure modes: nonsensical targets, conversational-metadata predicates,
// too-short entity names, stopword entities.

const STOPWORDS = new Set(["i", "you", "he", "she", "they", "we", "it", "the",
  "a", "an", "this", "that", "these", "those", "me", "him", "her", "them", "us"]);

const METADATA_PREDICATES = new Set(["talks_about", "mentions", "mentioned",
  "said", "discussed", "asked_about", "talked_about", "spoke_about",
  "references", "brought_up"]);

function isValidRelationship(rel: ExtractedRelationship): boolean {
  if (rel.confidence !== undefined && rel.confidence < 0.4) return false;
  const src = rel.source.trim().toLowerCase();
  const tgt = rel.target.trim().toLowerCase();
  if (src.length < 2 || tgt.length < 2) return false;
  if (STOPWORDS.has(src) || STOPWORDS.has(tgt)) return false;
  if (METADATA_PREDICATES.has(rel.predicate)) return false;
  // Reject targets that look like phrases (>3 words) — likely hallucinated
  if (tgt.split(/\s+/).length > 3) return false;
  return true;
}

function normalizeAndFilter(result: ExtractionResult): ExtractionResult {
  const relationships = result.relationships
    .map(r => ({ ...r, predicate: canonicalizePredicate(r.predicate) }))
    .filter(isValidRelationship);
  return { entities: result.entities, relationships };
}

// ─── Contradiction Groups ─────────────────────────────────────────────────────
//
// After canonicalization, predicates are stable. These groups define which
// canonical predicates are mutually exclusive for the same source entity.

const CONTRADICTION_GROUPS: string[][] = [
  ["likes", "dislikes"],    // affirmative vs negative preference
  ["lives_in", "lived_in"], // current vs past location
  ["is_dating", "is_single"],
];

function findContradictingPredicates(predicate: string): string[] {
  const norm = predicate.toLowerCase();
  for (const group of CONTRADICTION_GROUPS) {
    if (group.includes(norm)) return group.filter(p => p !== norm);
  }
  return [];
}

async function invalidateContradiction(charId: string, conversationId: string, userId: string, sourceEntityId: string, predicate: string, targetEntityId: string) {
  const contradicting = findContradictingPredicates(predicate);
  // Expire this predicate (for re-assertion updates) AND all semantic opposites FOR THE EXACT SAME TARGET.
  const predicatesToExpire = [predicate, ...contradicting];
  await db.update(tkgEdges).set({ validUntil: new Date() }).where(
    and(
      eq(tkgEdges.characterId, charId),
      eq(tkgEdges.conversationId, conversationId),
      eq(tkgEdges.userId, userId),
      eq(tkgEdges.sourceEntityId, sourceEntityId),
      eq(tkgEdges.targetEntityId, targetEntityId),
      sql`${tkgEdges.predicate} = ANY(ARRAY[${sql.join(predicatesToExpire.map(p => sql`${p}`), sql`, `)}]::text[])`,
      isNull(tkgEdges.validUntil),
    )
  );
}


async function resolveEntityIds(charId: string, conversationId: string, userId: string, facts: ExtractionResult): Promise<Map<string, string>> {
  const entityMap = new Map<string, string>();
  for (const entity of facts.entities) {
    const id = await upsertEntity(charId, conversationId, userId, entity);
    entityMap.set(entity.name.toLowerCase(), id);
  }
  for (const rel of facts.relationships) {
    for (const name of [rel.source, rel.target]) {
      if (!entityMap.has(name.toLowerCase())) {
        const id = await upsertEntity(charId, conversationId, userId, { name, type: "thing" });
        entityMap.set(name.toLowerCase(), id);
      }
    }
  }
  return entityMap;
}

async function insertEdges(charId: string, conversationId: string, userId: string, facts: ExtractionResult, entityMap: Map<string, string>, msgId?: string) {
  let created = 0;
  for (const rel of facts.relationships) {
    const sourceId = entityMap.get(rel.source.toLowerCase())!;
    const targetId = entityMap.get(rel.target.toLowerCase())!;
    await invalidateContradiction(charId, conversationId, userId, sourceId, rel.predicate, targetId);
    await db.insert(tkgEdges).values({
      characterId: charId, conversationId, userId, sourceEntityId: sourceId, targetEntityId: targetId,
      predicate: rel.predicate, confidence: rel.confidence ?? 1.0, sourceMessageId: msgId ?? null,
    });
    created++;
  }
  return created;
}

export async function upsertGraph(facts: ExtractionResult, characterId: string, conversationId: string, userId: string, messageId?: string) {
  if (facts.entities.length === 0 && facts.relationships.length === 0) return 0;
  const entityMap = await resolveEntityIds(characterId, conversationId, userId, facts);
  const edgesCreated = await insertEdges(characterId, conversationId, userId, facts, entityMap, messageId);
  await maybeSummarize(characterId, conversationId, userId);
  return edgesCreated;
}

// ─── Memory Retrieval ─────────────────────────────────────────────────────────

function formatEdgeAsFact(sourceName: string, predicate: string, targetName: string): string {
  return `${sourceName} ${predicate.replace(/_/g, " ")} ${targetName}`;
}

async function loadSummaryWithinBudget(charId: string, conversationId: string, userId: string, max: number): Promise<string | null> {
  const summary = await db.query.tkgSummaries.findFirst({
    where: and(eq(tkgSummaries.characterId, charId), eq(tkgSummaries.conversationId, conversationId), eq(tkgSummaries.userId, userId))
  });
  return (summary && summary.summary.length <= max) ? summary.summary : null;
}

function packEdgesIntoContext(edges: any[], maxChars: number): string | null {
  let context = "";
  for (const edge of edges) {
    const fact = formatEdgeAsFact(edge.sourceName, edge.predicate, edge.targetName);
    if (context.length + fact.length + 2 > maxChars) break;
    context += (context ? ". " : "") + fact;
  }
  return context || null;
}

export async function buildMemoryContext(characterId: string, conversationId: string, userId: string, maxChars: number = MEMORY_TOKEN_BUDGET) {
  const existing = await loadSummaryWithinBudget(characterId, conversationId, userId, maxChars);
  if (existing) return existing;
  
  const activeEdges = await fetchActiveCharacterEdges(characterId, conversationId, userId, 30);
  if (activeEdges.length === 0) return null;
  
  return packEdgesIntoContext(activeEdges, maxChars);
}

// ─── Summarization ────────────────────────────────────────────────────────────

async function maybeSummarize(charId: string, conversationId: string, userId: string): Promise<void> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(tkgEdges).where(
    and(eq(tkgEdges.characterId, charId), eq(tkgEdges.conversationId, conversationId), eq(tkgEdges.userId, userId), isNull(tkgEdges.validUntil))
  );
  const existing = await db.query.tkgSummaries.findFirst({
    where: and(eq(tkgSummaries.characterId, charId), eq(tkgSummaries.conversationId, conversationId), eq(tkgSummaries.userId, userId))
  });
  const threshold = existing ? existing.factCount + SUMMARIZATION_INCREMENT : SUMMARIZATION_EDGE_THRESHOLD;

  if (count >= threshold) {
    Logger.info("TKG", `Threshold reached (${count} >= ${threshold}). Starting summarization.`);
    runSummarization(charId, conversationId, userId, count).catch(err => Logger.error("TKG", "Summarization failed", err));
  }
}

async function executeSummarizationLlm(userId: string, facts: string[]): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { llmEndpoint: true, llmApiKey: true, llmModel: true },
  });
  const { baseUrl, apiKey, modelId } = resolveProviderConfig(user);
  const provider = createOpenAI({ baseURL: baseUrl, apiKey, compatibility: "compatible" });
  const result = await generateText({
    model: provider(modelId), system: SUMMARIZATION_PROMPT,
    prompt: buildSummarizationUserPrompt(facts), maxTokens: 600, temperature: 0.2,
  });
  return result.text;
}

async function saveSummaryConfig(charId: string, conversationId: string, userId: string, summary: string, count: number) {
  await db.insert(tkgSummaries)
    .values({ characterId: charId, conversationId, userId, summary, factCount: count })
    .onConflictDoUpdate({
      target: [tkgSummaries.characterId, tkgSummaries.conversationId, tkgSummaries.userId],
      set: { summary, factCount: count, updatedAt: new Date() },
    });
}

async function runSummarization(charId: string, conversationId: string, userId: string, factCount: number): Promise<void> {
  const edges = await fetchActiveCharacterEdges(charId, conversationId, userId);
  if (edges.length === 0) return;
  const facts = edges.map((e) => formatEdgeAsFact(e.sourceName, e.predicate, e.targetName));
  const text = await executeSummarizationLlm(userId, facts);
  await saveSummaryConfig(charId, conversationId, userId, text, factCount);
}

// ─── Orchestrator (called from chat route) ────────────────────────────────────

export async function extractAndStore(userMessage: string, assistantMessage: string, characterId: string, conversationId: string, userId: string, messageId?: string) {
  try {
    const facts = await extractFacts(userMessage, assistantMessage, userId);
    if (!facts || (facts.entities.length === 0 && facts.relationships.length === 0)) return;
    const edgesCreated = await upsertGraph(facts, characterId, conversationId, userId, messageId);
    if (edgesCreated > 0) {
      Logger.info("TKG", `Extracted ${facts.entities.length} entities, ${edgesCreated} edges`, { characterId, conversationId });
    }
  } catch (err) {
    Logger.error("TKG", "Extraction aborted", err instanceof Error ? err.message : err);

  }
}

// ─── Force Summarize (manual trigger from UI) ─────────────────────────────────

export async function forceSummarize(characterId: string, conversationId: string, userId: string): Promise<{ factCount: number }> {
  const edges = await fetchActiveCharacterEdges(characterId, conversationId, userId);
  if (edges.length === 0) {
    Logger.warn("TKG", "Summarize triggered but no facts exist", { characterId, conversationId });
    return { factCount: 0 };
  }
  const facts = edges.map(e => formatEdgeAsFact(e.sourceName, e.predicate, e.targetName));
  Logger.info("TKG", `Manual summarize: compressing ${edges.length} facts`, { characterId, conversationId });
  const text = await executeSummarizationLlm(userId, facts);
  await saveSummaryConfig(characterId, conversationId, userId, text, edges.length);
  Logger.info("TKG", "Manual summarize complete");
  return { factCount: edges.length };
}

// ─── Memory Display & Manual CRUD ─────────────────────────────────────────────

export type MemoryFact = { id: string; source: string; predicate: string; target: string; };

export async function getMemoryFacts(characterId: string, conversationId: string, userId: string): Promise<MemoryFact[]> {
  const edges = await fetchActiveCharacterEdges(characterId, conversationId, userId, 50);
  return edges.map((e) => ({ id: e.id, source: e.sourceName, predicate: e.predicate, target: e.targetName }));
}

export type MemorySummary = { id: string; content: string; entityCount: number; createdAt: string; };

export async function getMemorySummaries(characterId: string, conversationId: string, userId: string): Promise<MemorySummary[]> {
  const rows = await db.query.tkgSummaries.findMany({
    where: and(eq(tkgSummaries.characterId, characterId), eq(tkgSummaries.conversationId, conversationId), eq(tkgSummaries.userId, userId)),
    orderBy: (s) => desc(s.updatedAt),
  });
  return rows.map((row) => ({
    id: row.id, content: row.summary, entityCount: row.factCount, createdAt: row.updatedAt.toISOString(),
  }));
}

export async function addManualFact(charId: string, conversationId: string, userId: string, source: string, predicate: string, target: string): Promise<string> {
  const sourceId = await upsertEntity(charId, conversationId, userId, { name: source, type: "thing" });
  const targetId = await upsertEntity(charId, conversationId, userId, { name: target, type: "thing" });
  const [edge] = await db.insert(tkgEdges).values({
    characterId: charId, conversationId, userId, sourceEntityId: sourceId, targetEntityId: targetId, predicate, confidence: 1.0,
  }).returning({ id: tkgEdges.id });
  return edge.id;
}

export async function updateMemoryFact(edgeId: string, userId: string, updates: { predicate?: string; target?: string }): Promise<boolean> {
  const edge = await db.query.tkgEdges.findFirst({ where: and(eq(tkgEdges.id, edgeId), eq(tkgEdges.userId, userId)) });
  if (!edge) return false;
  if (updates.predicate) await db.update(tkgEdges).set({ predicate: updates.predicate }).where(eq(tkgEdges.id, edgeId));
  if (updates.target) {
    const targetId = await upsertEntity(edge.characterId, edge.conversationId!, userId, { name: updates.target, type: "thing" });
    await db.update(tkgEdges).set({ targetEntityId: targetId }).where(eq(tkgEdges.id, edgeId));
  }
  return true;
}

export async function deleteMemoryFact(edgeId: string, userId: string): Promise<boolean> {
  const edge = await db.query.tkgEdges.findFirst({ where: and(eq(tkgEdges.id, edgeId), eq(tkgEdges.userId, userId)) });
  if (!edge) return false;
  await db.update(tkgEdges).set({ validUntil: new Date() }).where(eq(tkgEdges.id, edgeId));
  return true;
}
