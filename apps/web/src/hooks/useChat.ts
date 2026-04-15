"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { Message, Conversation, Character } from "../lib/types";

type UseChatOptions = {
  characterId?: string;
  conversationId?: string;
};

type ChatState = {
  messages: Message[];
  conversation: Conversation | null;
  character: Character | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
};

export function useChat(options: UseChatOptions = {}): ChatState {
  const { characterId, conversationId } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        if (conversationId) {
          const msgs = await api.getMessages(conversationId);
          if (!cancelled) {
            setMessages(msgs);
            setIsLoading(false);
          }
          return;
        }

        const characters = await api.getCharacters();
        if (characters.length === 0) {
          setError("No characters available");
          setIsLoading(false);
          return;
        }

        const char = characterId
          ? characters.find((c) => c.id === characterId)
          : characters[0];

        if (!char) {
          setError("Character not found");
          setIsLoading(false);
          return;
        }

        if (!cancelled) setCharacter(char);

        const convos = await api.getConversations();
        const existingConvo = convos.find(
          (c) => c.characterId === char.id
        );

        const convo = existingConvo || await api.createConversation(char.id);

        if (!cancelled) {
          setConversation(convo);
          const existingMessages = await api.getMessages(convo.id);
          setMessages(existingMessages);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [characterId, conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation || isStreaming) return;

      setError(null);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantId,
        conversationId: conversation.id,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      streamingIdRef.current = assistantId;
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      await api.streamMessage(
        conversation.id,
        content,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m,
            ),
          );
          setIsStreaming(false);
          streamingIdRef.current = null;
        },
        (err) => {
          setError(err.message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || "Failed to get response", isStreaming: false }
                : m,
            ),
          );
          setIsStreaming(false);
          streamingIdRef.current = null;
        },
      );
    },
    [conversation, isStreaming],
  );

  return {
    messages,
    conversation,
    character,
    isLoading,
    isStreaming,
    error,
    sendMessage,
  };
}