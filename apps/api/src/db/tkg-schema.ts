import {
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { characters, users, messages, conversations } from "./schema";

export const tkgEntities = pgTable(
  "tkg_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    // Dual-scoping: if present, fact is isolated to a specific roleplay conversation.
    // If null, fact is shared across all conversations with the character (v0.2 'chat' mode).
    // Currently, we enforce 'roleplay' mode.
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    entityType: text("entity_type").notNull().default("thing"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    mentionCount: integer("mention_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // In PG, nulls are distinct in unique constraints. For v0.2 chat mode (conversationId=null),
    // this would allow duplicate entities. 
    // For now we assume conversationId is ALWAYS provided (Roleplay mode).
    uniqueIndex("idx_tkg_entities_unique").on(
      table.characterId,
      table.conversationId,
      table.userId,
      sql`lower(${table.name})`,
    ),
  ],
);

export const tkgEdges = pgTable(
  "tkg_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceEntityId: uuid("source_entity_id")
      .notNull()
      .references(() => tkgEntities.id, { onDelete: "cascade" }),
    targetEntityId: uuid("target_entity_id")
      .notNull()
      .references(() => tkgEntities.id, { onDelete: "cascade" }),
    predicate: text("predicate").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    sourceMessageId: uuid("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    confidence: real("confidence").notNull().default(1.0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_tkg_edges_active").on(table.characterId, table.conversationId, table.userId).where(sql`${table.validUntil} IS NULL`),
    index("idx_tkg_edges_source").on(table.sourceEntityId),
    index("idx_tkg_edges_target").on(table.targetEntityId),
  ],
);

export const tkgSummaries = pgTable(
  "tkg_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    factCount: integer("fact_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_tkg_summaries_unique").on(table.characterId, table.conversationId, table.userId),
  ],
);
