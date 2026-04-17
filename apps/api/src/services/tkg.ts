import { db } from "../db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { tkgEntities, tkgEdges, tkgSummaries } from "../db/tkg-schema";
import { users } from "../db/schema";
import { decryptKey } from "./crypto";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  SUMMARIZATION_PROMPT,
  buildSummarizationUserPrompt,
} from "./tkg-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractedEntity = {
  name: string;
  type: string;
};

type ExtractedRelationship = {
  source: string;
  predicate: string;
  target: string;
  confidence?: number;
};

type ExtractionResult = {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
};

type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const EXTRACTION_TIMEOUT_MS = 8000;
const EXTRACTION_MAX_TOKENS = 500;
const MEMORY_TOKEN_BUDGET = 2000;
const SUMMARIZATION_EDGE_THRESHOLD = 50;
const SUMMARIZATION_INCREMENT = 25;

// ─── Heuristic Trigger ────────────────────────────────────────────────────────

const MEMORY_TRIGGERS = [
  /\b(i|my|mine|i'm|i've|i'll|i'd)\b.{0,40}\b(live|moved?|work|study|like|love|hate|prefer|enjoy|have|own|am|was|been|got|want|need|feel)\b/i,
  /\b(my|our)\s+(name|age|job|cat|dog|pet|friend|sister|brother|mom|dad|partner|wife|husband|boyfriend|girlfriend|family)\b/i,
  /\b(favorite|fav|prefer|always|never|since|used to|hobbi?es?)\b/i,
  /\b(birthday|born|anniversary|graduated|married|divorced|started|quit|retired)\b/i,
  /\b(moved? to|live[sd]? in|from|born in|grew up|hometown)\b/i,
  /\b(allergic|afraid|scared|diagnosed|suffer)\b/i,
];

export function shouldAutoExtract(userMessage: string): boolean {
  return MEMORY_TRIGGERS.some((pattern) => pattern.test(userMessage));
}

// ─── LLM Config Resolution ───────────────────────────────────────────────────

async function resolveLlmConfig(userId: string): Promise<LlmConfig> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { llmEndpoint: true, llmApiKey: true, llmModel: true },
  });

  return {
    baseUrl:
      user?.llmEndpoint ||
      process.env.LLM_BASE_URL ||
      "https://mino.redemption.pw/x/zai/glm-5",
    apiKey:
      (user?.llmApiKey ? decryptKey(user.llmApiKey) : "") ||
      process.env.LLM_API_KEY ||
      "",
    model: user?.llmModel || process.env.LLM_MODEL || "glm-5.1",
  };
}

// ─── Extraction ───────────────────────────────────────────────────────────────

function parseExtractionResponse(raw: string): ExtractionResult | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.entities) || !Array.isArray(parsed.relationships))
      return null;

    return {
      entities: parsed.entities.filter(
        (e: unknown) =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as ExtractedEntity).name === "string" &&
          (e as ExtractedEntity).name.trim().length > 0,
      ),
      relationships: parsed.relationships.filter(
        (r: unknown) =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as ExtractedRelationship).source === "string" &&
          typeof (r as ExtractedRelationship).predicate === "string" &&
          typeof (r as ExtractedRelationship).target === "string",
      ),
    };
  } catch {
    return null;
  }
}

export async function extractFacts(
  userMessage: string,
  assistantMessage: string,
  userId: string,
): Promise<ExtractionResult | null> {
  const config = await resolveLlmConfig(userId);
  const provider = createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: provider(config.model),
      system: EXTRACTION_SYSTEM_PROMPT,
      prompt: buildExtractionUserPrompt(userMessage, assistantMessage),
      maxTokens: EXTRACTION_MAX_TOKENS,
      temperature: 0.1,
      abortSignal: controller.signal,
    });

    return parseExtractionResponse(result.text);
  } catch (err) {
    console.error("[TKG] extraction LLM call failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Graph Upsert ─────────────────────────────────────────────────────────────

async function upsertEntity(
  characterId: string,
  userId: string,
  entity: ExtractedEntity,
): Promise<string> {
  const normalizedName = entity.name.trim();
  const entityType = entity.type || "thing";

  const [row] = await db
    .insert(tkgEntities)
    .values({ characterId, userId, name: normalizedName, entityType })
    .onConflictDoUpdate({
      target: [tkgEntities.characterId, tkgEntities.userId],
      targetWhere: sql`lower(${tkgEntities.name}) = lower(${normalizedName})`,
      set: {
        mentionCount: sql`${tkgEntities.mentionCount} + 1`,
        lastSeenAt: new Date(),
      },
    })
    .returning({ id: tkgEntities.id });

  return row.id;
}

async function invalidateContradiction(
  characterId: string,
  userId: string,
  sourceEntityId: string,
  predicate: string,
): Promise<void> {
  await db
    .update(tkgEdges)
    .set({ validUntil: new Date() })
    .where(
      and(
        eq(tkgEdges.characterId, characterId),
        eq(tkgEdges.userId, userId),
        eq(tkgEdges.sourceEntityId, sourceEntityId),
        eq(tkgEdges.predicate, predicate),
        isNull(tkgEdges.validUntil),
      ),
    );
}

export async function upsertGraph(
  facts: ExtractionResult,
  characterId: string,
  userId: string,
  messageId?: string,
): Promise<number> {
  if (facts.entities.length === 0 && facts.relationships.length === 0) return 0;

  const entityMap = new Map<string, string>();

  for (const entity of facts.entities) {
    const id = await upsertEntity(characterId, userId, entity);
    entityMap.set(entity.name.toLowerCase(), id);
  }

  let edgesCreated = 0;

  for (const rel of facts.relationships) {
    const sourceKey = rel.source.toLowerCase();
    const targetKey = rel.target.toLowerCase();

    let sourceId = entityMap.get(sourceKey);
    if (!sourceId) {
      sourceId = await upsertEntity(characterId, userId, { name: rel.source, type: "thing" });
      entityMap.set(sourceKey, sourceId);
    }

    let targetId = entityMap.get(targetKey);
    if (!targetId) {
      targetId = await upsertEntity(characterId, userId, { name: rel.target, type: "thing" });
      entityMap.set(targetKey, targetId);
    }

    await invalidateContradiction(characterId, userId, sourceId, rel.predicate);

    await db.insert(tkgEdges).values({
      characterId,
      userId,
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      predicate: rel.predicate,
      confidence: rel.confidence ?? 1.0,
      sourceMessageId: messageId ?? null,
    });
    edgesCreated++;
  }

  await maybeSummarize(characterId, userId);

  return edgesCreated;
}

// ─── Memory Retrieval ─────────────────────────────────────────────────────────

function formatEdgeAsFact(
  sourceName: string,
  predicate: string,
  targetName: string,
): string {
  const verb = predicate.replace(/_/g, " ");
  return `${sourceName} ${verb} ${targetName}`;
}

export async function buildMemoryContext(
  characterId: string,
  userId: string,
  maxChars: number = MEMORY_TOKEN_BUDGET,
): Promise<string | null> {
  const summary = await db.query.tkgSummaries.findFirst({
    where: and(
      eq(tkgSummaries.characterId, characterId),
      eq(tkgSummaries.userId, userId),
    ),
  });

  if (summary && summary.summary.length <= maxChars) {
    return summary.summary;
  }

  const activeEdges = await db
    .select({
      sourceName: tkgEntities.name,
      predicate: tkgEdges.predicate,
      targetName: sql<string>`t2.name`,
    })
    .from(tkgEdges)
    .innerJoin(tkgEntities, eq(tkgEdges.sourceEntityId, tkgEntities.id))
    .innerJoin(
      sql`tkg_entities t2`,
      sql`${tkgEdges.targetEntityId} = t2.id`,
    )
    .where(
      and(
        eq(tkgEdges.characterId, characterId),
        eq(tkgEdges.userId, userId),
        isNull(tkgEdges.validUntil),
      ),
    )
    .orderBy(desc(tkgEntities.mentionCount), desc(tkgEntities.lastSeenAt))
    .limit(30);

  if (activeEdges.length === 0) return null;

  let context = "";
  for (const edge of activeEdges) {
    const fact = formatEdgeAsFact(edge.sourceName, edge.predicate, edge.targetName);
    if (context.length + fact.length + 2 > maxChars) break;
    context += (context ? ". " : "") + fact;
  }

  return context || null;
}

// ─── Summarization ────────────────────────────────────────────────────────────

async function maybeSummarize(
  characterId: string,
  userId: string,
): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tkgEdges)
    .where(
      and(
        eq(tkgEdges.characterId, characterId),
        eq(tkgEdges.userId, userId),
        isNull(tkgEdges.validUntil),
      ),
    );

  const existingSummary = await db.query.tkgSummaries.findFirst({
    where: and(
      eq(tkgSummaries.characterId, characterId),
      eq(tkgSummaries.userId, userId),
    ),
    columns: { factCount: true },
  });

  const threshold = existingSummary
    ? existingSummary.factCount + SUMMARIZATION_INCREMENT
    : SUMMARIZATION_EDGE_THRESHOLD;

  if (count < threshold) return;

  runSummarization(characterId, userId, count).catch((err) =>
    console.error("[TKG] summarization failed:", err instanceof Error ? err.message : err),
  );
}

async function runSummarization(
  characterId: string,
  userId: string,
  factCount: number,
): Promise<void> {
  const edges = await db
    .select({
      sourceName: tkgEntities.name,
      predicate: tkgEdges.predicate,
      targetName: sql<string>`t2.name`,
    })
    .from(tkgEdges)
    .innerJoin(tkgEntities, eq(tkgEdges.sourceEntityId, tkgEntities.id))
    .innerJoin(sql`tkg_entities t2`, sql`${tkgEdges.targetEntityId} = t2.id`)
    .where(
      and(
        eq(tkgEdges.characterId, characterId),
        eq(tkgEdges.userId, userId),
        isNull(tkgEdges.validUntil),
      ),
    )
    .orderBy(desc(tkgEntities.mentionCount));

  if (edges.length === 0) return;

  const facts = edges.map((e) => formatEdgeAsFact(e.sourceName, e.predicate, e.targetName));

  const config = await resolveLlmConfig(userId);
  const provider = createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });

  const result = await generateText({
    model: provider(config.model),
    system: SUMMARIZATION_PROMPT,
    prompt: buildSummarizationUserPrompt(facts),
    maxTokens: 600,
    temperature: 0.2,
  });

  await db
    .insert(tkgSummaries)
    .values({ characterId, userId, summary: result.text, factCount })
    .onConflictDoUpdate({
      target: [tkgSummaries.characterId, tkgSummaries.userId],
      set: { summary: result.text, factCount, updatedAt: new Date() },
    });
}

// ─── Orchestrator (called from chat route) ────────────────────────────────────

export async function extractAndStore(
  userMessage: string,
  assistantMessage: string,
  characterId: string,
  userId: string,
  messageId?: string,
): Promise<void> {
  const facts = await extractFacts(userMessage, assistantMessage, userId);
  if (!facts || (facts.entities.length === 0 && facts.relationships.length === 0)) return;

  const edgesCreated = await upsertGraph(facts, characterId, userId, messageId);
  if (edgesCreated > 0) {
    console.log(`[TKG] extracted ${facts.entities.length} entities, ${edgesCreated} edges for character=${characterId}`);
  }
}
