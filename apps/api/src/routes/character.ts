import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { characters } from "../db/schema";
import { jwtSetup, authGuard } from "../middleware/auth";

const characterBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  avatarUrl: t.Optional(t.Union([t.String(), t.Null()])),
  systemPrompt: t.String({ minLength: 1, maxLength: 2000 }),
  firstMessage: t.String({ minLength: 1, maxLength: 500 }),
  exampleDialogue: t.Optional(t.String({ maxLength: 2000 })),
  isPublic: t.Optional(t.Boolean()),
  memoryMode: t.Optional(t.Union([t.Literal("manual"), t.Literal("auto")])),
});

const characterPatchBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  avatarUrl: t.Optional(t.Union([t.String(), t.Null()])),
  systemPrompt: t.Optional(t.String({ minLength: 1, maxLength: 2000 })),
  firstMessage: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  exampleDialogue: t.Optional(t.String({ maxLength: 2000 })),
  isPublic: t.Optional(t.Boolean()),
  memoryMode: t.Optional(t.Union([t.Literal("manual"), t.Literal("auto")])),
});

async function assertOwnership(
  characterId: string,
  userId: string,
  set: { status?: number | string },
): Promise<void> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { creatorId: true },
  });

  if (!character) {
    set.status = 404;
    throw new Error("Character not found");
  }

  if (character.creatorId !== userId) {
    set.status = 403;
    throw new Error("Forbidden");
  }
}

export const characterRoutes = new Elysia({ prefix: "/characters" })
  .get("/", async () =>
    db.query.characters.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        isPublic: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
      },
      where: eq(characters.isPublic, true),
    }),
  )
  .get("/:id", async ({ params, set }) => {
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, params.id),
    });

    if (!character) {
      set.status = 404;
      return { message: "Character not found" };
    }

    return character;
  })
  .use(jwtSetup)
  .use(authGuard)
  .get("/mine", async ({ userId }) =>
    db.query.characters.findMany({
      where: eq(characters.creatorId, userId!),
      columns: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        systemPrompt: true,
        firstMessage: true,
        exampleDialogue: true,
        isPublic: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
        memoryMode: true,
      },
    }),
  )
  .post(
    "/",
    async ({ body, userId, set }) => {
      const [created] = await db
        .insert(characters)
        .values({
          name: body.name,
          description: body.description ?? "",
          avatarUrl: body.avatarUrl ?? null,
          systemPrompt: body.systemPrompt,
          firstMessage: body.firstMessage,
          exampleDialogue: body.exampleDialogue ?? "",
          isPublic: body.isPublic ?? true,
          memoryMode: body.memoryMode ?? "manual",
          creatorId: userId!,
        })
        .returning();

      set.status = 201;
      return created;
    },
    { body: characterBody },
  )
  .patch(
    "/:id",
    async ({ params, body, userId, set }) => {
      await assertOwnership(params.id, userId!, set);

      const [updated] = await db
        .update(characters)
        .set({
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
          ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
          ...(body.firstMessage !== undefined && { firstMessage: body.firstMessage }),
          ...(body.exampleDialogue !== undefined && { exampleDialogue: body.exampleDialogue }),
          ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
          ...(body.memoryMode !== undefined && { memoryMode: body.memoryMode }),
          updatedAt: new Date(),
        })
        .where(eq(characters.id, params.id))
        .returning();

      return updated;
    },
    { body: characterPatchBody },
  )
  .delete("/:id", async ({ params, userId, set }) => {
    await assertOwnership(params.id, userId!, set);

    await db.delete(characters).where(eq(characters.id, params.id));

    set.status = 204;
    return;
  });
