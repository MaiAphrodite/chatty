import { Elysia, t } from "elysia";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "../db";
import { conversations, messages, characters } from "../db/schema";
import { authGuard } from "../middleware/auth";
import { streamChatCompletion, parseSSEContent } from "../services/proxy";

export const chatRoutes = new Elysia({ prefix: "/chat" })
  .use(authGuard)
  .get("/conversations", async ({ userId }) => {
    const result = await db.query.conversations.findMany({
      where: (c, { eq }) => eq(c.userId, userId!),
      orderBy: (c) => desc(c.updatedAt),
      with: {
        character: {
          columns: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return result;
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
        .values({
          userId: userId!,
          characterId: body.characterId,
          title: `Chat with ${character.name}`,
        })
        .returning();

      return conversation;
    },
    {
      body: t.Object({
        characterId: t.String({ format: "uuid" }),
      }),
    },
  )
  .get(
    "/conversations/:id/messages",
    async ({ params, userId }) => {
      const conversation = await db.query.conversations.findFirst({
        where: (c, { and, eq }) =>
          and(eq(c.id, params.id), eq(c.userId, userId!)),
      });

      if (!conversation) return { message: "Conversation not found" };

      return db.query.messages.findMany({
        where: (m, { eq }) => eq(m.conversationId, params.id),
        orderBy: (m) => asc(m.createdAt),
      });
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    },
  )
  .post(
    "/conversations/:id/messages",
    async ({ params, body, userId, set }) => {
      const conversation = await db.query.conversations.findFirst({
        where: (c, { and, eq }) =>
          and(eq(c.id, params.id), eq(c.userId, userId!)),
        with: { character: true },
      });

      if (!conversation) {
        set.status = 404;
        return { message: "Conversation not found" };
      }

      await db.insert(messages).values({
        conversationId: params.id,
        role: "user",
        content: body.content,
      });

      const history = await db.query.messages.findMany({
        where: (m, { eq }) => eq(m.conversationId, params.id),
        orderBy: (m) => asc(m.createdAt),
        columns: { role: true, content: true },
      });

      const llmMessages = [
        {
          role: "system" as const,
          content: conversation.character.systemPrompt,
        },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      try {
        const proxyResponse = await streamChatCompletion(llmMessages);

        if (!proxyResponse.body) {
          set.status = 502;
          return { message: "No response from LLM" };
        }

        const reader = proxyResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
                fullContent += parseSSEContent(
                  decoder.decode(value, { stream: true }),
                );
              }

              if (fullContent.trim()) {
                await db.insert(messages).values({
                  conversationId: params.id,
                  role: "assistant",
                  content: fullContent,
                });

                await db
                  .update(conversations)
                  .set({ updatedAt: new Date() })
                  .where(eq(conversations.id, params.id));
              }

              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        set.status = 502;
        const errorMessage =
          error instanceof Error ? error.message : "LLM proxy failed";
        return { message: errorMessage };
      }
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({ content: t.String({ minLength: 1 }) }),
    },
  );
