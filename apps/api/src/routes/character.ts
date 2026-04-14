import { Elysia, t } from "elysia";
import { db } from "../db";

export const characterRoutes = new Elysia({ prefix: "/characters" }).get(
  "/",
  async () => {
    return db.query.characters.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  },
);
