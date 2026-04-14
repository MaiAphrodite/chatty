import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

const connectionString =
  process.env.DATABASE_URL || "postgres://chatty:chatty@localhost:5432/chatty";

const client = postgres(connectionString);
export const db = drizzle(client, { schema: { ...schema, ...relations } });
