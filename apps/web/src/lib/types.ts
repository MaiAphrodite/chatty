export type User = {
  id: string;
  username: string;
  createdAt?: string;
};

export type Character = {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  systemPrompt?: string;
  firstMessage?: string;
  exampleDialogue?: string;
  isPublic: boolean;
  creatorId: string;
  createdAt: string;
  updatedAt?: string;
};

export type CharacterPayload = {
  name: string;
  description?: string;
  avatarUrl?: string | null;
  systemPrompt: string;
  firstMessage: string;
  exampleDialogue?: string;
  isPublic?: boolean;
};

export type Conversation = {
  id: string;
  userId: string;
  characterId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  character?: Pick<Character, "id" | "name" | "avatarUrl">;
  latestMessage?: Pick<Message, "content" | "createdAt">;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
};
