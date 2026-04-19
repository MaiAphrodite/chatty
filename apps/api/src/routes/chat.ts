import { Elysia, t } from "elysia";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Logger } from "../services/logger";
import { resolveProviderConfig } from "../services/provider";
import { conversations, messages, characters, users } from "../db/schema";
import { authGuard } from "../middleware/auth";
import { decryptKey } from "../services/crypto";
import {
  buildMemoryContext,
  shouldAutoExtract,
  extractAndStore,
  getMemoryFacts,
  getMemorySummaries,
  getSummaryEditorState,
  saveManualSummary,
  autoSummarizeRollingWindow,
  addManualFact,
  updateMemoryFact,
  deleteMemoryFact,
  forceSummarize,
} from "../services/tkg";

type HistoryMessage = { id: string; role: string; content: string };
type LlmMessage = { role: "system" | "user" | "assistant"; content: string };
type ScopedConversation = { id: string; characterId: string };

function isConversationScopedPath(path: string): boolean {
  return path.includes("/conversations/");
}

function extractConversationId(params: unknown): string | null {
  const id = (params as Record<string, unknown>)?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function findScopedConversation(
  conversationId: string,
  userId: string,
): Promise<ScopedConversation | null> {
  return (await db.query.conversations.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, conversationId), eq(c.userId, userId)),
    columns: { id: true, characterId: true },
  })) ?? null;
}

async function resolveScopedConversation(
  path: string,
  params: unknown,
  userId: string,
  set: { status?: number | string },
): Promise<ScopedConversation | null> {
  if (!isConversationScopedPath(path)) return null;

  const conversationId = extractConversationId(params);
  if (!conversationId) return null;

  const conversation = await findScopedConversation(conversationId, userId);
  if (conversation) return conversation;

  set.status = 404;
  return null;
}

function enforceKnownRouteErrorStatus(set: { status?: number | string }): void {
  const statusCode = typeof set.status === "number" ? set.status : Number(set.status);
  if (!Number.isFinite(statusCode) || statusCode < 400) set.status = 500;
}

function logUnhandledRouteError(path: string, error: unknown): void {
  Logger.error("HTTP", "Unhandled route error", { path, error });
}

function ensureConversationExists<T extends { message: string }>(
  conversation: ScopedConversation | null,
  set: { status?: number | string },
  response: T,
): ScopedConversation | T {
  if (conversation) return conversation;
  set.status = 404;
  return response;
}

function ensureSummaryBody(summary: string, set: { status?: number | string }): { message: string } | null {
  if (summary.trim()) return null;
  set.status = 400;
  return { message: "Summary cannot be empty" };
}

function liftGreetingIntoSystem(
  systemPrompt: string,
  history: HistoryMessage[],
): { system: string; history: HistoryMessage[] } {
  // Many providers (DeepSeek, Grok, etc.) reject conversations where the first
  // content message is role=assistant. The character greeting is always the
  // first DB message and pre-dates any user turn. Lift it into the system prompt
  // as narrative context so the turn ordering is always user-first.
  const firstUserIdx = history.findIndex(m => m.role === "user");
  const leadingAssistants = firstUserIdx > 0
    ? history.slice(0, firstUserIdx).filter(m => m.role === "assistant")
    : firstUserIdx === -1 ? history.filter(m => m.role === "assistant") : [];

  if (leadingAssistants.length === 0) return { system: systemPrompt, history };

  const greetingBlock = leadingAssistants.map(m => `[Your opening message]: ${m.content}`).join("\n");
  const augmentedSystem = `${systemPrompt}\n\n${greetingBlock}`;
  const trimmedHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : [];
  return { system: augmentedSystem, history: trimmedHistory };
}

function buildLlmMessages(
  systemPrompt: string,
  history: HistoryMessage[]
): LlmMessage[] {
  const { system, history: trimmed } = liftGreetingIntoSystem(systemPrompt, history);
  return [
    { role: "system", content: system },
    ...trimmed.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];
}

async function persistAssistantMessage(
  conversationId: string,
  content: string
): Promise<string | null> {
  const [saved] = await db.insert(messages)
    .values({ conversationId, role: "assistant", content })
    .returning({ id: messages.id });
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
  return saved?.id ?? null;
}

function buildSseStream(
  textStream: AsyncIterable<string>,
  conversationId: string,
  onComplete?: (fullText: string) => void,
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start: (controller) => streamSseChunks(textStream, conversationId, onComplete, encoder, controller),
  });
}

function sanitizeProviderErrorMessage(message: string): string {
  return message.replace(/https?:\/\/[^\s]*/g, "[url]").replace(/Bearer [^\s]*/g, "[key]");
}

function emitSseChunk(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, payload: unknown): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function emitSseDone(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder): void {
  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
}

async function flushAssistantMessage(
  conversationId: string,
  fullText: string,
  onComplete: ((fullText: string) => void) | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  if (!fullText.trim()) return;
  const savedId = await persistAssistantMessage(conversationId, fullText);
  if (savedId) emitSseChunk(controller, encoder, { type: "saved_id", id: savedId });
  onComplete?.(fullText);
}

function emitSseProviderError(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error("LLM", "Stream interrupted by provider error", message);
  emitSseChunk(controller, encoder, { type: "error", message: sanitizeProviderErrorMessage(message) });
}

async function streamSseChunks(
  textStream: AsyncIterable<string>,
  conversationId: string,
  onComplete: ((fullText: string) => void) | undefined,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  let fullText = "";
  try {
    for await (const chunk of textStream) {
      fullText += chunk;
      emitSseChunk(controller, encoder, chunk);
    }
    await flushAssistantMessage(conversationId, fullText, onComplete, controller, encoder);
    emitSseDone(controller, encoder);
  } catch (error) {
    emitSseProviderError(controller, encoder, error);
  } finally {
    controller.close();
  }
}

// ─── POST /messages Helper Pipeline ──────────────────────────────────────────

async function persistUserMessage(conversationId: string, content: string, history: HistoryMessage[]) {
  const [userMsg] = await db
    .insert(messages)
    .values({ conversationId, role: "user", content })
    .returning({ id: messages.id });
  history.push({ id: userMsg.id, role: "user", content });
  return userMsg.id;
}

function pruneHistory(history: HistoryMessage[], activeAssistantIds?: string[]): HistoryMessage[] {
  if (!activeAssistantIds || activeAssistantIds.length === 0) return history;
  const activeSet = new Set(activeAssistantIds);
  return history.filter(m => m.role !== "assistant" || activeSet.has(m.id));
}

async function buildSystemPrompt(
  characterSystemPrompt: string,
  characterId: string,
  conversationId: string,
  userId: string,
  overrides: { systemPromptOverride?: string; negativePrompt?: string },
): Promise<string> {
  const memoryContext = await buildMemoryContext(characterId, conversationId, userId);
  const basePrompt = memoryContext
    ? `${characterSystemPrompt}\n\n[Memory — things you remember about the user]:\n${memoryContext}`
    : characterSystemPrompt;
  return [
    overrides.systemPromptOverride?.trim(),
    basePrompt,
    overrides.negativePrompt?.trim() ? `\n\n[avoid]: ${overrides.negativePrompt}` : null,
  ].filter(Boolean).join("\n\n");
}

function assembleStreamOptions(
  llmMessages: ReturnType<typeof buildLlmMessages>,
  modelId: string,
  provider: ReturnType<typeof createOpenAI>,
  params: { temperature?: number; topP?: number; maxTokens?: number; repPenalty?: number },
): Parameters<typeof streamText>[0] {
  const opts: Parameters<typeof streamText>[0] = { model: provider(modelId), messages: llmMessages };
  if (params.temperature !== undefined) opts.temperature = params.temperature;
  if (params.topP !== undefined) opts.topP = params.topP;
  if (params.maxTokens !== undefined) opts.maxTokens = params.maxTokens;
  if (params.repPenalty !== undefined) opts.frequencyPenalty = params.repPenalty;
  return opts;
}

function createOnCompleteCallback(
  memoryMode: string,
  userContent: string | undefined,
  userMsgId: string | undefined,
  characterId: string,
  conversationId: string,
  userId: string,
): (assistantText: string) => void {
  return (assistantText: string) => {
    Logger.info("LLM", `Stream completed. Approx tokens: ${Math.round(assistantText.length / 4)}`);
    if (memoryMode === "auto" && userContent && userMsgId && shouldAutoExtract(userContent, assistantText)) {
      extractAndStore(userContent, assistantText, characterId, conversationId, userId, userMsgId)
        .catch(err => Logger.error("TKG", "Auto-extraction background job failed", err));
    }
  };
}

export const chatRoutes = new Elysia({ prefix: "/chat" })
  .use(authGuard)
  .derive(async ({ params, userId, request, set }) => {
    const path = new URL(request.url).pathname;
    const scopedConversation = await resolveScopedConversation(path, params, userId!, set);
    return { scopedConversation };
  })
  .onError(({ error, code, set, path }) => {
    if (code === "UNKNOWN") {
      logUnhandledRouteError(path, error);
      enforceKnownRouteErrorStatus(set);
      return { message: "Internal server error" };
    }
  })
  .get("/conversations", async ({ userId }) => {
    const result = await db.query.conversations.findMany({
      where: (c, { eq }) => eq(c.userId, userId!),
      orderBy: (c) => desc(c.updatedAt),
      with: { character: { columns: { id: true, name: true, avatarUrl: true } } },
    });

    const withLatest = await Promise.all(
      result.map(async (conv) => {
        const latest = await db.query.messages.findFirst({
          where: (m, { eq }) => eq(m.conversationId, conv.id),
          orderBy: (m) => desc(m.createdAt),
          columns: { content: true, createdAt: true },
        });
        return { ...conv, latestMessage: latest || null };
      })
    );

    return withLatest;
  })
  .post(
    "/conversations",
    async ({ userId, body }) => {
      const character = await db.query.characters.findFirst({
        where: (c, { eq }) => eq(c.id, body.characterId),
      });

      if (!character) return { message: "Character not found" };

      const [conversation] = await db
        .insert(conversations)
        .values({ userId: userId!, characterId: body.characterId, title: `Chat with ${character.name}` })
        .returning();

      if (character.firstMessage) {
        await db.insert(messages).values({
          conversationId: conversation.id,
          role: "assistant",
          content: character.firstMessage,
        });
      }

      return conversation;
    },
    { body: t.Object({ characterId: t.String({ format: "uuid" }) }) }
  )
  .get(
    "/conversations/:id/messages",
    async ({ params, userId }) => {
      const conversation = await db.query.conversations.findFirst({
        where: (c, { and, eq }) => and(eq(c.id, params.id), eq(c.userId, userId!)),
      });

      if (!conversation) return { message: "Conversation not found" };

      return db.query.messages.findMany({
        where: (m, { eq }) => eq(m.conversationId, params.id),
        orderBy: (m) => asc(m.createdAt),
      });
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .post(
    "/conversations/:id/messages",
    async ({ params, body, userId, set }) => {
      try {
        const conversation = await db.query.conversations.findFirst({
          where: (c, { and, eq }) => and(eq(c.id, params.id), eq(c.userId, userId!)),
          with: { character: true },
        });

        if (!conversation) { set.status = 404; return { message: "Conversation not found" }; }

        const history: HistoryMessage[] = await db.query.messages.findMany({
          where: (m, { eq }) => eq(m.conversationId, params.id),
          orderBy: (m) => asc(m.createdAt),
          columns: { id: true, role: true, content: true },
        });

        let userMsgId: string | undefined;
        let userContent = body.content;

        if (body.content) {
          userMsgId = await persistUserMessage(params.id, body.content, history);
        } else {
          const lastUser = [...history].reverse().find(m => m.role === "user");
          if (lastUser) { userContent = lastUser.content; userMsgId = lastUser.id; }
        }

        const prunedHistory = pruneHistory(history, body.activeAssistantMessageIds);

        const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId!) });
        const { baseUrl, apiKey, modelId } = resolveProviderConfig(user);
        Logger.info("LLM", `Provider resolved: ${modelId} @ ${baseUrl}`);

        const openaiProvider = createOpenAI({ baseURL: baseUrl, apiKey, compatibility: "compatible" });

        const systemPrompt = await buildSystemPrompt(
          conversation.character.systemPrompt,
          conversation.characterId,
          params.id,
          userId!,
          { systemPromptOverride: body.systemPrompt, negativePrompt: body.negativePrompt },
        );

        const streamOptions = assembleStreamOptions(
          buildLlmMessages(systemPrompt, prunedHistory),
          modelId,
          openaiProvider,
          { temperature: body.temperature, topP: body.topP, maxTokens: body.maxTokens, repPenalty: body.repPenalty },
        );

        Logger.info("LLM", `Stream init: ${modelId} @ ${baseUrl}`, { temperature: streamOptions.temperature, topP: streamOptions.topP });
        const result = streamText(streamOptions);
        const onComplete = createOnCompleteCallback(
          conversation.character.memoryMode,
          userContent, userMsgId,
          conversation.characterId, params.id, userId!,
        );
        return new Response(
          buildSseStream(result.textStream, params.id, onComplete),
          { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" } },
        );
      } catch (error) {
        Logger.error("LLM", "Message pipeline failed", error);
        set.status = 500;
        const msg = error instanceof Error ? error.message : "Internal server error";
        return { message: msg };
      }
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        content: t.Optional(t.String({ minLength: 1 })),
        activeAssistantMessageIds: t.Optional(t.Array(t.String())),
        endpoint: t.Optional(t.String()),
        temperature: t.Optional(t.Number()),
        topP: t.Optional(t.Number()),
        maxTokens: t.Optional(t.Number()),
        repPenalty: t.Optional(t.Number()),
        systemPrompt: t.Optional(t.String()),
        negativePrompt: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/conversations/:id",
    async ({ params, body, userId, set }) => {
      const conv = await db.query.conversations.findFirst({
        where: (c, { and, eq }) => and(eq(c.id, params.id), eq(c.userId, userId!)),
      });
      if (!conv) { set.status = 404; return { message: "Conversation not found" }; }

      const [updated] = await db
        .update(conversations)
        .set({ title: body.title, updatedAt: new Date() })
        .where(eq(conversations.id, params.id))
        .returning();
      return updated;
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({ title: t.String({ minLength: 1, maxLength: 100 }) }),
    }
  )
  .delete(
    "/conversations/:id",
    async ({ params, userId, set }) => {
      const conv = await db.query.conversations.findFirst({
        where: (c, { and, eq }) => and(eq(c.id, params.id), eq(c.userId, userId!)),
      });
      if (!conv) { set.status = 404; return { message: "Conversation not found" }; }

      await db.delete(conversations).where(eq(conversations.id, params.id));
      set.status = 204;
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .post(
    "/messages/:id/remember",
    async ({ params, userId, set }) => {
      const message = await db.query.messages.findFirst({
        where: eq(messages.id, params.id),
        with: { conversation: { columns: { userId: true, characterId: true } } },
      });

      if (!message || message.conversation.userId !== userId!) {
        set.status = 404;
        return { message: "Message not found" };
      }

      const surroundingMessages = await db.query.messages.findMany({
        where: eq(messages.conversationId, message.conversationId),
        orderBy: (m) => asc(m.createdAt),
        columns: { id: true, role: true, content: true },
      });

      const msgIndex = surroundingMessages.findIndex((m) => m.id === params.id);
      const windowStart = Math.max(0, msgIndex - 2);
      const windowEnd = Math.min(surroundingMessages.length, msgIndex + 3);
      const window = surroundingMessages.slice(windowStart, windowEnd);

      extractAndStore(
        surroundingMessages.map(m => `[${m.role}] ${m.content}`).join("\n"),
        message.content,
        message.conversation.characterId,
        message.conversationId,
        userId!,
        message.id
      ).catch(err => Logger.error("TKG", "Manual memory extraction failed", err));
      return { remembered: true };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .get(
    "/conversations/:id/context-stats",
    async ({ params, userId, scopedConversation }) => {
      const conversation = scopedConversation;
      if (!conversation) return { messageCount: 0, estimatedTokens: 0, memoryTokens: 0 };

      const [msgs, memCtx] = await Promise.all([
        db.query.messages.findMany({
          where: (m, { eq }) => eq(m.conversationId, params.id),
          columns: { content: true, role: true },
        }),
        buildMemoryContext(conversation.characterId, params.id, userId!),
      ]);

      const totalChars = msgs.reduce((s, m) => s + m.content.length, 0);
      const memChars = memCtx?.length ?? 0;
      return {
        messageCount: msgs.length,
        estimatedTokens: Math.ceil(totalChars / 4),
        memoryTokens: Math.ceil(memChars / 4),
      };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .post(
    "/conversations/:id/summarize",
    async ({ params, userId, set, scopedConversation }) => {
      try {
        const conv = scopedConversation;
        if (!conv) { set.status = 404; return { message: "Conversation not found" }; }
        
        const result = await forceSummarize(conv.characterId, params.id, userId!);
        return result;
      } catch (err) {
        Logger.error("TKG", "Manual summarize failed", err);
        set.status = 500;
        return { message: "Summarization failed" };
      }
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .get(
    "/conversations/:id/memories",
    async ({ params, userId, set, scopedConversation }) => {
      const conv = scopedConversation;
      if (!conv) { set.status = 404; return { message: "Conversation not found" }; }

      const context = await buildMemoryContext(conv.characterId, params.id, userId!);
      const facts = await getMemoryFacts(conv.characterId, params.id, userId!);
      const summaries = await getMemorySummaries(conv.characterId, params.id, userId!);
      const tokenCount = context ? Math.ceil(context.length / 4) : 0;
      return { context, facts, summaries, tokenCount, tokenBudget: 2000 };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .get(
    "/conversations/:id/summary-editor",
    async ({ params, userId, set, scopedConversation }) => {
      const conv = ensureConversationExists(scopedConversation, set, { message: "Conversation not found" });
      if ("message" in conv) return conv;
      return getSummaryEditorState(conv.characterId, params.id, userId!);
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  )
  .post(
    "/conversations/:id/summary-editor/auto",
    async ({ params, userId, body, set, scopedConversation }) => {
      const conv = ensureConversationExists(scopedConversation, set, { message: "Conversation not found" });
      if ("message" in conv) return conv;
      return autoSummarizeRollingWindow(conv.characterId, params.id, userId!, body.mode);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({ mode: t.Union([t.Literal("delta"), t.Literal("full")]) }),
    }
  )
  .put(
    "/conversations/:id/summary-editor",
    async ({ params, userId, body, set, scopedConversation }) => {
      const conv = ensureConversationExists(scopedConversation, set, { message: "Conversation not found" });
      if ("message" in conv) return conv;

      const summaryValidation = ensureSummaryBody(body.summary, set);
      if (summaryValidation) return summaryValidation;

      return saveManualSummary(conv.characterId, params.id, userId!, body.summary);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({ summary: t.String({ minLength: 1, maxLength: 20000 }) }),
    }
  )
  .post(
    "/conversations/:id/memories",
    async ({ params, userId, body, set, scopedConversation }) => {
      const conv = scopedConversation;
      if (!conv) { set.status = 404; return { message: "Conversation not found" }; }

      const id = await addManualFact(
        conv.characterId,
        params.id,
        userId!,
        body.source,
        body.predicate,
        body.target,
      );
      return { id };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        source: t.String({ minLength: 1 }),
        predicate: t.String({ minLength: 1 }),
        target: t.String({ minLength: 1 }),
      }),
    }
  )
  .patch(
    "/memories/:edgeId",
    async ({ params, userId, body, set }) => {
      const ok = await updateMemoryFact(params.edgeId, userId!, body);
      if (!ok) { set.status = 404; return { message: "Memory not found" }; }
      return { updated: true };
    },
    {
      params: t.Object({ edgeId: t.String({ format: "uuid" }) }),
      body: t.Object({
        predicate: t.Optional(t.String({ minLength: 1 })),
        target: t.Optional(t.String({ minLength: 1 })),
      }),
    }
  )
  .delete(
    "/memories/:edgeId",
    async ({ params, userId, set }) => {
      const ok = await deleteMemoryFact(params.edgeId, userId!);
      if (!ok) { set.status = 404; return { message: "Memory not found" }; }
      set.status = 204;
    },
    { params: t.Object({ edgeId: t.String({ format: "uuid" }) }) }
  );
