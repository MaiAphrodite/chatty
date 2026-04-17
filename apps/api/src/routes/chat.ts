import { Elysia, t } from "elysia";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { conversations, messages, characters, users } from "../db/schema";
import { authGuard } from "../middleware/auth";
import { decryptKey } from "../services/crypto";
import {
  buildMemoryContext,
  shouldAutoExtract,
  extractAndStore,
} from "../services/tkg";

function buildLlmMessages(
  systemPrompt: string,
  history: { role: string; content: string }[]
) {
  return [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

async function persistAssistantMessage(
  conversationId: string,
  content: string
) {
  await db.insert(messages).values({ conversationId, role: "assistant", content });
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

function buildSseStream(
  textStream: AsyncIterable<string>,
  conversationId: string,
  onComplete?: (fullText: string) => void,
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const chunk of textStream) {
          fullText += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
        if (fullText.trim()) {
          await persistAssistantMessage(conversationId, fullText);
          onComplete?.(fullText);
        }
      }
    },
  });
}

export const chatRoutes = new Elysia({ prefix: "/chat" })
  .use(authGuard)
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
      const conversation = await db.query.conversations.findFirst({
        where: (c, { and, eq }) => and(eq(c.id, params.id), eq(c.userId, userId!)),
        with: { character: true },
      });

      if (!conversation) {
        set.status = 404;
        return { message: "Conversation not found" };
      }

      const [userMsg] = await db
        .insert(messages)
        .values({ conversationId: params.id, role: "user", content: body.content })
        .returning({ id: messages.id });

      const history = await db.query.messages.findMany({
        where: (m, { eq }) => eq(m.conversationId, params.id),
        orderBy: (m) => asc(m.createdAt),
        columns: { role: true, content: true },
      });

      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId!),
      });

      const memoryContext = await buildMemoryContext(
        conversation.characterId,
        userId!,
      );

      const systemPrompt = memoryContext
        ? `${conversation.character.systemPrompt}\n\n[Memory — things you remember about the user]:\n${memoryContext}`
        : conversation.character.systemPrompt;

      const openaiProvider = createOpenAI({
        baseURL: user?.llmEndpoint || process.env.LLM_BASE_URL || "https://mino.redemption.pw/x/zai/glm-5",
        apiKey: (user?.llmApiKey ? decryptKey(user.llmApiKey) : null) || process.env.LLM_API_KEY || "",
      });

      const modelId = user?.llmModel || process.env.LLM_MODEL || "glm-5.1";

      const characterId = conversation.characterId;
      const memoryMode = conversation.character.memoryMode;
      const userContent = body.content;

      try {
        const result = streamText({
          model: openaiProvider(modelId),
          messages: buildLlmMessages(systemPrompt, history),
        });

        const onComplete = (assistantText: string) => {
          if (memoryMode === "auto" && shouldAutoExtract(userContent)) {
            extractAndStore(userContent, assistantText, characterId, userId!, userMsg.id)
              .catch((err) => console.error("[TKG] auto-extraction failed:", err));
          }
        };

        return new Response(
          buildSseStream(result.textStream, params.id, onComplete),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          },
        );
      } catch (error) {
        set.status = 502;
        return { message: error instanceof Error ? error.message : "LLM proxy failed" };
      }
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({ content: t.String({ minLength: 1 }) }),
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

      const userParts = window.filter((m) => m.role === "user").map((m) => m.content);
      const assistantParts = window.filter((m) => m.role === "assistant").map((m) => m.content);

      await extractAndStore(
        userParts.join("\n"),
        assistantParts.join("\n"),
        message.conversation.characterId,
        userId!,
        params.id,
      );

      return { remembered: true };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) }
  );
