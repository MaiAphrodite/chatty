import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { jwtSetup, authGuard, setAuthCookie, clearAuthCookie } from "../middleware/auth";

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
        .returning({ id: users.id, username: users.username });

      const token = await jwt.sign({ sub: user.id });
      setAuthCookie(cookie, token);

      return { id: user.id, username: user.username };
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

      return { id: user.id, username: user.username };
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
      columns: { id: true, username: true, createdAt: true },
    });

    if (!user) return { message: "User not found" };
    return user;
  });
