import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { authRoutes } from "./routes/auth";
import { chatRoutes } from "./routes/chat";
import { characterRoutes } from "./routes/character";
import { Logger } from "./services/logger";

Logger.start();
Logger.info("SYSTEM", "Logger dashboard auth initialized", {
  user: process.env.LOGGER_DASHBOARD_USER || "admin",
  auth: "basic",
});

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const app = new Elysia()
  .use(cors({ origin: CORS_ORIGIN, credentials: true }))
  .get("/health", async () => {
    try {
      await db.execute("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch {
      return { status: "error", db: "disconnected" };
    }
  })
  .use(authRoutes)
  .use(chatRoutes)
  .use(characterRoutes)
  .listen(4000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
