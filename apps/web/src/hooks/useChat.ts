"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { Conversation, Character, Message, ModelConfig } from "../lib/types";

const MEMORY_UPDATED_EVENT = "chatty:memory-updated";


const DEFAULT_MODEL_CONFIG: ModelConfig = {
  systemPromptOverride: "",
  temperature: 0.8,
  topP: 0.9,
  maxTokens: 2048,
  repPenalty: 1.1,
  negativePrompt: "",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type UseChatOptions = {
  characterId?: string;
  conversationId?: string;
  modelConfig?: {
    systemPromptOverride?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    repPenalty?: number;
    negativePrompt?: string;
  };
};

type ChatState = {
  messages: Message[];
  conversation: Conversation | null;
  character: Character | null;
  isLoading: boolean;
  streamingMessageId: string | null;
  error: string | null;
  variantGroups: Map<string, string[]>; // predecessorId -> [variantId, ...]
  activeVariants: Map<string, number>;  // predecessorId -> active index
  realMessageIds: Map<string, string>;  // fakeClientId -> real DB id
};

type ChatAction =
  | { type: "INIT_DONE"; conversation: Conversation; character: Character | null; messages: Message[] }
  | { type: "INIT_ERROR"; error: string }
  | { type: "STREAM_START"; userMsg: Message | null; assistantMsg: Message; predecessorId: string | null }
  | { type: "STREAM_CHUNK"; id: string; content: string }
  | { type: "STREAM_DONE" }
  | { type: "SAVE_ID"; fakeId: string; realId: string }
  | { type: "STREAM_ERROR"; error: string; assistantMsgId: string }
  | { type: "DISMISS_ERROR" }
  | { type: "DELETE_MESSAGE"; id: string }
  | { type: "EDIT_MESSAGE"; id: string; content: string }
  | { type: "SWIPE"; predecessorId: string; direction: 1 | -1 };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: ChatState = {
  messages: [],
  conversation: null,
  character: null,
  isLoading: true,
  streamingMessageId: null,
  error: null,
  variantGroups: new Map(),
  activeVariants: new Map(),
  realMessageIds: new Map(),
};

function buildVariantsFromMessages(messages: Message[]): {
  variantGroups: Map<string, string[]>;
  activeVariants: Map<string, number>;
} {
  const variantGroups = new Map<string, string[]>();
  const activeVariants = new Map<string, number>();

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role !== "assistant") continue;
    // Find the predecessor (last non-assistant message index before this run)
    let predIdx = i - 1;
    while (predIdx >= 0 && messages[predIdx].role === "assistant") predIdx--;
    const predecessorId = predIdx >= 0 ? messages[predIdx].id : "__root__";

    if (!variantGroups.has(predecessorId)) {
      variantGroups.set(predecessorId, []);
    }
    variantGroups.get(predecessorId)!.push(messages[i].id);
  }

  variantGroups.forEach((variants, key) => {
    activeVariants.set(key, variants.length - 1); // default active = most recent
  });

  return { variantGroups, activeVariants };
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "INIT_DONE": {
      const { variantGroups, activeVariants } = buildVariantsFromMessages(action.messages);
      return { ...state, conversation: action.conversation, character: action.character, messages: action.messages, isLoading: false, variantGroups, activeVariants, realMessageIds: new Map() };
    }
    case "INIT_ERROR":
      return { ...state, error: action.error, isLoading: false };

    case "STREAM_START": {
      const newMessages = action.userMsg
        ? [...state.messages, action.userMsg, action.assistantMsg]
        : [...state.messages, action.assistantMsg];

      const predId = action.predecessorId ?? "__root__";
      const newGroups = new Map(state.variantGroups);
      const existing = newGroups.get(predId) ?? [];
      newGroups.set(predId, [...existing, action.assistantMsg.id]);

      const newActive = new Map(state.activeVariants);
      newActive.set(predId, newGroups.get(predId)!.length - 1);

      return { ...state, messages: newMessages, streamingMessageId: action.assistantMsg.id, variantGroups: newGroups, activeVariants: newActive };
    }
    case "STREAM_CHUNK":
      return {
        ...state,
        messages: state.messages.map((m) => m.id === action.id ? { ...m, content: action.content } : m),
      };
    case "STREAM_DONE":
      return { ...state, streamingMessageId: null };
    case "SAVE_ID": {
      const newReal = new Map(state.realMessageIds);
      newReal.set(action.fakeId, action.realId);
      // Also update the variant groups map to swap in the real ID
      const newGroups = new Map(state.variantGroups);
      newGroups.forEach((variants, predId) => {
        const idx = variants.indexOf(action.fakeId);
        if (idx !== -1) {
          const updated = [...variants];
          updated[idx] = action.realId;
          newGroups.set(predId, updated);
        }
      });
      return { ...state, realMessageIds: newReal, variantGroups: newGroups };
    }
    case "STREAM_ERROR":
      return {
        ...state,
        streamingMessageId: null,
        error: action.error,
        messages: state.messages.filter((m) => m.id !== action.assistantMsgId),
      };
    case "DISMISS_ERROR":
      return { ...state, error: null };
    case "DELETE_MESSAGE":
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) };
    case "EDIT_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) => m.id === action.id ? { ...m, content: action.content } : m),
      };
    case "SWIPE": {
      const variants = state.variantGroups.get(action.predecessorId);
      if (!variants || variants.length <= 1) return state;
      const current = state.activeVariants.get(action.predecessorId) ?? 0;
      const next = Math.max(0, Math.min(variants.length - 1, current + action.direction));
      const newActive = new Map(state.activeVariants);
      newActive.set(action.predecessorId, next);
      return { ...state, activeVariants: newActive };
    }
    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMessage(conversationId: string, role: Message["role"], content: string): Message {
  return { id: crypto.randomUUID(), conversationId, role, content, createdAt: new Date().toISOString() };
}

async function* readSseStream(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload && payload !== "[DONE]") yield payload;
    }
  }
}

async function findOrCreateConversation(characterId: string): Promise<{ conversation: Conversation; character: Character | null }> {
  const characters = await api.getCharacters();
  const character = characters.find((c) => c.id === characterId) ?? null;
  const convos = await api.getConversations();
  const existing = convos.find((c) => c.characterId === characterId);
  const conversation = existing ?? await api.createConversation(characterId);
  return { conversation, character };
}

function loadModelConfigFromStorage(characterId: string | undefined): ModelConfig {
  if (!characterId) return DEFAULT_MODEL_CONFIG;
  try {
    const raw = localStorage.getItem(`chatty:model-config:${characterId}`);
    if (!raw) return DEFAULT_MODEL_CONFIG;
    return { ...DEFAULT_MODEL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

// TKG extraction is async and can take anywhere from 3s (fast models) to 60s
// (reasoning models). Fire the event in waves so the rail always reflects the
// final extracted state without the user needing to manually refresh.
const MEMORY_REFRESH_WAVES_MS = [3_000, 15_000, 65_000] as const;

function dispatchMemoryUpdate() {
  for (const delay of MEMORY_REFRESH_WAVES_MS) {
    setTimeout(() => window.dispatchEvent(new Event(MEMORY_UPDATED_EVENT)), delay);
  }
}

function buildRequestPayload(
  content: string | undefined,
  config: ModelConfig,
  hasVariants: boolean,
  activeVariantIds: string[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = content ? { content } : {};
  if (config.systemPromptOverride) payload.systemPrompt = config.systemPromptOverride;
  if (config.temperature !== DEFAULT_MODEL_CONFIG.temperature) payload.temperature = config.temperature;
  if (config.topP !== DEFAULT_MODEL_CONFIG.topP) payload.topP = config.topP;
  if (config.maxTokens !== DEFAULT_MODEL_CONFIG.maxTokens) payload.maxTokens = config.maxTokens;
  if (config.repPenalty !== DEFAULT_MODEL_CONFIG.repPenalty) payload.repPenalty = config.repPenalty;
  if (config.negativePrompt) payload.negativePrompt = config.negativePrompt;
  if (hasVariants && activeVariantIds.length > 0) payload.activeAssistantMessageIds = activeVariantIds;
  return payload;
}

function parseStreamChunk(chunk: string): { type: "text"; text: string } | { type: "saved_id"; id: string } | { type: "error"; message: string } {
  try {
    const parsed = JSON.parse(chunk);
    if (parsed && typeof parsed === "object") {
      if (parsed.type === "saved_id") return { type: "saved_id", id: parsed.id };
      if (parsed.type === "error") return { type: "error", message: parsed.message || "Upstream provider error" };
    }
    return { type: "text", text: typeof parsed === "string" ? parsed : chunk };
  } catch {
    return { type: "text", text: chunk };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat({ characterId, conversationId, modelConfig: explicitConfig }: UseChatOptions = {}) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const convRef = useRef<Conversation | null>(null);
  convRef.current = state.conversation;

  const effectiveConfig: ModelConfig = explicitConfig
    ? { ...DEFAULT_MODEL_CONFIG, ...explicitConfig }
    : loadModelConfigFromStorage(characterId);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        if (conversationId) {
          const msgs = await api.getMessages(conversationId);
          const convos = await api.getConversations();
          const conversation = convos.find(c => c.id === conversationId);
          const character = conversation?.character as Character | null ?? null;
          if (!cancelled) {
            dispatch({ type: "INIT_DONE", conversation: conversation || { id: conversationId } as Conversation, character, messages: msgs });
          }
          return;
        }

        if (!characterId) return;

        const { conversation, character } = await findOrCreateConversation(characterId);
        const messages = await api.getMessages(conversation.id);
        if (!cancelled) dispatch({ type: "INIT_DONE", conversation, character, messages });
      } catch (err) {
        if (!cancelled) dispatch({ type: "INIT_ERROR", error: err instanceof Error ? err.message : "Failed to load chat" });
      }
    }

    initialize();
    return () => { cancelled = true; abortRef.current?.abort(); };
  }, [characterId, conversationId]);

  const sendMessage = useCallback(async (content?: string, predecessorId?: string | null) => {
    const conversation = convRef.current;
    if (!conversation || state.streamingMessageId) return;

    const assistantMsg = makeMessage(conversation.id, "assistant", "");
    const userMsg = content ? makeMessage(conversation.id, "user", content) : null;

    let resolvedPredId = predecessorId ?? null;
    if (userMsg) {
      resolvedPredId = userMsg.id;
    } else if (!predecessorId) {
      const lastUserMsg = [...state.messages].reverse().find(m => m.role === "user");
      resolvedPredId = lastUserMsg ? lastUserMsg.id : "__root__";
    }

    dispatch({ type: "STREAM_START", userMsg, assistantMsg, predecessorId: resolvedPredId });

    const activeVariantIds: string[] = [];
    let hasVariants = false;
    state.activeVariants.forEach((activeIdx, predId) => {
      const variants = state.variantGroups.get(predId);
      if (variants) {
        if (variants.length > 1) hasVariants = true;
        activeVariantIds.push(state.realMessageIds.get(variants[activeIdx]) ?? variants[activeIdx]);
      }
    });

    try {
      abortRef.current = new AbortController();
      const payload = buildRequestPayload(content, effectiveConfig, hasVariants, activeVariantIds);
      const response = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      let fullContent = "";
      for await (const chunk of readSseStream(response)) {
        const parsed = parseStreamChunk(chunk);
        if (parsed.type === "saved_id") { dispatch({ type: "SAVE_ID", fakeId: assistantMsg.id, realId: parsed.id }); continue; }
        if (parsed.type === "error") throw new Error(parsed.message);
        fullContent += parsed.text;
        dispatch({ type: "STREAM_CHUNK", id: assistantMsg.id, content: fullContent });
      }
      dispatch({ type: "STREAM_DONE" });
      dispatchMemoryUpdate();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg = err instanceof Error ? err.message : "Streaming failed";
        dispatch({ type: "STREAM_ERROR", error: errorMsg, assistantMsgId: assistantMsg.id });
        // Auto-dismiss error banner after 8 seconds
        setTimeout(() => dispatch({ type: "DISMISS_ERROR" }), 8000);
      }
    }
  }, [state.streamingMessageId, state.activeVariants, state.variantGroups, effectiveConfig]);

  const regenerateMessage = useCallback(async (predecessorId: string | null) => {
    // Non-destructive: do NOT delete the old message. Just stream a new variant.
    await sendMessage(undefined, predecessorId);
  }, [sendMessage]);

  const deleteMessage = useCallback(async (id: string) => {
    dispatch({ type: "DELETE_MESSAGE", id });
    await api.deleteMessage(id).catch(() => { /* best effort */ });
  }, []);

  const editMessage = useCallback(async (id: string, content: string) => {
    dispatch({ type: "EDIT_MESSAGE", id, content });
    await api.editMessage(id, content).catch(console.error);
  }, []);

  const continueMessage = useCallback(async () => {
    const conversation = convRef.current;
    if (!conversation || state.streamingMessageId) return;
    await sendMessage("[CONTINUE]", null);
  }, [state.streamingMessageId, sendMessage]);

  const rememberMessage = useCallback(async (messageId: string) => {
    const result = await api.rememberMessage(messageId);
    dispatchMemoryUpdate();
    return result;
  }, []);

  const swipeVariant = useCallback((predecessorId: string, direction: 1 | -1) => {
    dispatch({ type: "SWIPE", predecessorId, direction });
  }, []);

  const dismissError = useCallback(() => dispatch({ type: "DISMISS_ERROR" }), []);

  return {
    messages: state.messages,
    conversation: state.conversation,
    character: state.character,
    isLoading: state.isLoading,
    streamingMessageId: state.streamingMessageId,
    error: state.error,
    variantGroups: state.variantGroups,
    activeVariants: state.activeVariants,
    sendMessage,
    deleteMessage,
    editMessage,
    regenerateMessage,
    continueMessage,
    rememberMessage,
    swipeVariant,
    dismissError,
  };
}
