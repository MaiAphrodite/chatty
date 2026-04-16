import { relations } from "drizzle-orm";
import { conversations, messages, characters, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  conversations: many(conversations),
  creator: one(users, {
    fields: [characters.creatorId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    character: one(characters, {
      fields: [conversations.characterId],
      references: [characters.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
