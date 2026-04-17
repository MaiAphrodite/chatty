import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { jwtSetup, authGuard, setAuthCookie, clearAuthCookie } from "../middleware/auth";
import { encryptKey, decryptKey } from "../services/crypto";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtSetup)
  .post(
    "/register",
    async ({ jwt, cookie, body, set }) => {
      const existing = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.username, body.username),
      });

      if (existing) {
        set.status = 409;
        return { message: "Username already taken" };
      }

      const passwordHash = await Bun.password.hash(body.password, {
        algorithm: "argon2id",
      });

      const [user] = await db
        .insert(users)
        .values({ username: body.username, passwordHash })
        .returning();

      const token = await jwt.sign({ sub: user.id });
      setAuthCookie(cookie, token);

      return { 
        id: user.id, 
        username: user.username,
        llmEndpoint: user.llmEndpoint,
        llmApiKey: user.llmApiKey ? decryptKey(user.llmApiKey) : null,
        llmModel: user.llmModel
      };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 32 }),
        password: t.String({ minLength: 6, maxLength: 128 }),
      }),
    },
  )
  .post(
    "/login",
    async ({ jwt, cookie, body, set }) => {
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.username, body.username),
      });

      if (!user) {
        set.status = 401;
        return { message: "Invalid credentials" };
      }

      const valid = await Bun.password.verify(body.password, user.passwordHash);
      if (!valid) {
        set.status = 401;
        return { message: "Invalid credentials" };
      }

      const token = await jwt.sign({ sub: user.id });
      setAuthCookie(cookie, token);

      return { 
        id: user.id, 
        username: user.username,
        llmEndpoint: user.llmEndpoint,
        llmApiKey: user.llmApiKey ? decryptKey(user.llmApiKey) : null,
        llmModel: user.llmModel
      };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  )
  .post("/logout", ({ cookie }) => {
    clearAuthCookie(cookie);
    return { message: "Logged out" };
  })
  .use(authGuard)
  .get("/me", async ({ userId }) => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId!),
      columns: { 
        id: true, 
        username: true, 
        createdAt: true,
        llmEndpoint: true,
        llmApiKey: true,
        llmModel: true
      },
    });

    if (!user) return { message: "User not found" };
    return {
      ...user,
      llmApiKey: user.llmApiKey ? decryptKey(user.llmApiKey) : null,
    };
  })
  .patch(
    "/me/settings",
    async ({ userId, body, set }) => {
      const encryptedKey = body.llmApiKey ? encryptKey(body.llmApiKey) : null;
      
      const payload: Partial<typeof users.$inferInsert> = {};
      if (body.llmEndpoint !== undefined) payload.llmEndpoint = body.llmEndpoint;
      if (body.llmApiKey !== undefined) payload.llmApiKey = encryptedKey;
      if (body.llmModel !== undefined) payload.llmModel = body.llmModel;

      const [user] = await db
        .update(users)
        .set(payload)
        .where(eq(users.id, userId!))
        .returning();

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      return {
        id: user.id,
        username: user.username,
        llmEndpoint: user.llmEndpoint,
        llmApiKey: user.llmApiKey ? decryptKey(user.llmApiKey) : null,
        llmModel: user.llmModel,
      };
    },
    {
      body: t.Object({
        llmEndpoint: t.Optional(t.Union([t.String(), t.Null()])),
        llmApiKey: t.Optional(t.Union([t.String(), t.Null()])),
        llmModel: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  );
