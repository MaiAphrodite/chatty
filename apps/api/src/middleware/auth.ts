import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

const JWT_SECRET =
  process.env.JWT_SECRET || "chatty-dev-secret-please-change-in-production";

export const jwtSetup = new Elysia({ name: "jwt-setup" }).use(
  jwt({
    name: "jwt",
    secret: JWT_SECRET,
    exp: "7d",
  }),
);

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtSetup)
  .derive({ as: "scoped" }, async ({ jwt: jwtInstance, cookie }) => {
    const token = cookie.auth?.value;
    if (!token) return { userId: null as string | null };

    const payload = await jwtInstance.verify(token as string);
    if (!payload) return { userId: null as string | null };

    // @ts-ignore - Elysia JWT payload type doesn't natively include custom claims like 'sub' without explicit Schema
    const sub = (payload as Record<string, any>).sub;
    if (!sub) return { userId: null as string | null };

    return { userId: sub as string };
  })
  .onBeforeHandle({ as: "scoped" }, ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
  });

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export function setAuthCookie(
  cookie: Record<string, any>,
  token: string,
): void {
  cookie.auth.set({
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(cookie: Record<string, any>): void {
  cookie.auth.set({
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
