"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { Conversation, Character, Message } from "../lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type UseChatOptions = {
  characterId?: string;
  conversationId?: string;
};

type ChatState = {
  messages: Message[];
  conversation: Conversation | null;
  character: Character | null;
  isLoading: boolean;
  streamingMessageId: string | null;
  error: string | null;
};

type ChatAction =
  | { type: "INIT_DONE"; conversation: Conversation; character: Character | null; messages: Message[] }
  | { type: "INIT_ERROR"; error: string }
  | { type: "STREAM_START"; userMsg: Message; assistantMsg: Message }
  | { type: "STREAM_CHUNK"; id: string; content: string }
  | { type: "STREAM_DONE" }
  | { type: "STREAM_ERROR"; error: string; assistantMsgId: string }
  | { type: "DELETE_MESSAGE"; id: string }
  | { type: "EDIT_MESSAGE"; id: string; content: string };
  // TKG_HOOK: Add TKG_CONTEXT_UPDATED action here when implementing TCG feature.

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: ChatState = {
  messages: [],
  conversation: null,
  character: null,
  isLoading: true,
  streamingMessageId: null,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "INIT_DONE":
      return { ...state, conversation: action.conversation, character: action.character, messages: action.messages, isLoading: false };
    case "INIT_ERROR":
      return { ...state, error: action.error, isLoading: false };
    case "STREAM_START":
      return { ...state, messages: [...state.messages, action.userMsg, action.assistantMsg], streamingMessageId: action.assistantMsg.id };
    case "STREAM_CHUNK":
      return {
        ...state,
        messages: state.messages.map((m) => m.id === action.id ? { ...m, content: action.content } : m),
      };
    case "STREAM_DONE":
      return { ...state, streamingMessageId: null };
    case "STREAM_ERROR":
      return {
        ...state,
        streamingMessageId: null,
        error: action.error,
        messages: state.messages.filter((m) => m.id !== action.assistantMsgId),
      };
    case "DELETE_MESSAGE":
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) };
    case "EDIT_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) => m.id === action.id ? { ...m, content: action.content } : m),
      };
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat({ characterId, conversationId }: UseChatOptions = {}) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const convRef = useRef<Conversation | null>(null);
  convRef.current = state.conversation;

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        if (conversationId) {
          const msgs = await api.getMessages(conversationId);
          // No character context when entering via direct conversationId
          if (!cancelled) dispatch({ type: "INIT_DONE", conversation: { id: conversationId } as Conversation, character: null, messages: msgs });
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

  const sendMessage = useCallback(async (content: string) => {
    const conversation = convRef.current;
    if (!conversation || state.streamingMessageId) return;

    const userMsg = makeMessage(conversation.id, "user", content);
    const assistantMsg = makeMessage(conversation.id, "assistant", "");
    dispatch({ type: "STREAM_START", userMsg, assistantMsg });

    try {
      abortRef.current = new AbortController();
      const response = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      let fullContent = "";
      for await (const chunk of readSseStream(response)) {
        try { fullContent += JSON.parse(chunk); } catch { fullContent += chunk; }
        dispatch({ type: "STREAM_CHUNK", id: assistantMsg.id, content: fullContent });
      }
      dispatch({ type: "STREAM_DONE" });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        dispatch({ type: "STREAM_ERROR", error: err instanceof Error ? err.message : "Streaming failed", assistantMsgId: assistantMsg.id });
      }
    }
  }, [state.streamingMessageId]);

  const deleteMessage = useCallback(async (id: string) => {
    dispatch({ type: "DELETE_MESSAGE", id });
    await api.deleteMessage(id).catch(console.error);
  }, []);

  const editMessage = useCallback(async (id: string, content: string) => {
    dispatch({ type: "EDIT_MESSAGE", id, content });
    await api.editMessage(id, content).catch(console.error);
  }, []);

  const continueMessage = useCallback(async () => {
    const conversation = convRef.current;
    if (!conversation || state.streamingMessageId) return;
    await sendMessage("[CONTINUE]");
  }, [state.streamingMessageId, sendMessage]);

  const rememberMessage = useCallback(async (messageId: string) => {
    return api.rememberMessage(messageId);
  }, []);

  return {
    messages: state.messages,
    conversation: state.conversation,
    character: state.character,
    isLoading: state.isLoading,
    streamingMessageId: state.streamingMessageId,
    error: state.error,
    sendMessage,
    deleteMessage,
    editMessage,
    continueMessage,
    rememberMessage,
  };
}
