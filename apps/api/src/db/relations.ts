import { relations } from "drizzle-orm";
import { conversations, messages, characters, users } from "./schema";
import { tkgEntities, tkgEdges, tkgSummaries } from "./tkg-schema";

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

export const tkgEntitiesRelations = relations(tkgEntities, ({ one, many }) => ({
  character: one(characters, {
    fields: [tkgEntities.characterId],
    references: [characters.id],
  }),
  user: one(users, {
    fields: [tkgEntities.userId],
    references: [users.id],
  }),
  outgoingEdges: many(tkgEdges, { relationName: "sourceEntity" }),
  incomingEdges: many(tkgEdges, { relationName: "targetEntity" }),
}));

export const tkgEdgesRelations = relations(tkgEdges, ({ one }) => ({
  character: one(characters, {
    fields: [tkgEdges.characterId],
    references: [characters.id],
  }),
  user: one(users, {
    fields: [tkgEdges.userId],
    references: [users.id],
  }),
  sourceEntity: one(tkgEntities, {
    fields: [tkgEdges.sourceEntityId],
    references: [tkgEntities.id],
    relationName: "sourceEntity",
  }),
  targetEntity: one(tkgEntities, {
    fields: [tkgEdges.targetEntityId],
    references: [tkgEntities.id],
    relationName: "targetEntity",
  }),
  sourceMessage: one(messages, {
    fields: [tkgEdges.sourceMessageId],
    references: [messages.id],
  }),
}));

export const tkgSummariesRelations = relations(tkgSummaries, ({ one }) => ({
  character: one(characters, {
    fields: [tkgSummaries.characterId],
    references: [characters.id],
  }),
  user: one(users, {
    fields: [tkgSummaries.userId],
    references: [users.id],
  }),
}));

