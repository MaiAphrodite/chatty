export type User = {
  id: string;
  username: string;
  createdAt?: string;
  llmEndpoint?: string | null;
  llmApiKey?: string | null;
  llmModel?: string | null;
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
  memoryMode: "manual" | "auto";
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
  memoryMode?: "manual" | "auto";
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
};

export type MemoryFact = {
  id: string;
  source: string;
  predicate: string;
  target: string;
};

export type ConnectionTestResult = {
  ok: boolean;
  models: string[];
  error: string | null;
};

export type ModelConfig = {
  systemPromptOverride: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  repPenalty: number;
  negativePrompt: string;
};

export type MemorySummary = {
  id: string;
  content: string;
  entityCount: number;
  createdAt: string;
  updatedAt?: string;
};

export type SummaryEditorState = {
  summary: string;
  factCount: number;
  updatedAt: string | null;
  deltaFactCount: number;
  deltaTokenEstimate: number;
  messagesSinceUpdate: number;
};
