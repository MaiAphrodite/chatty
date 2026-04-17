"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../hooks/useChat";
import { CharacterHeader } from "../../components/CharacterHeader";
import { MessageRow } from "../../components/MessageRow";
import { ChatInput } from "../../components/ChatInput";
import type { Message } from "../../lib/types";
import styles from "./chat.module.css";

function shouldGroup(messages: Message[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (prev.role !== curr.role) return false;
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap < 5 * 60 * 1000;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { messages, character, isLoading, streamingMessageId, error, sendMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingDots}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CharacterHeader character={character} />

      <div className={styles.messages}>
        {messages.map((message, index) => (
          <MessageRow
            key={message.id}
            message={message}
            senderName={message.role === "assistant" ? (character?.name ?? "Assistant") : (user?.username ?? "You")}
            avatarUrl={message.role === "assistant" ? (character?.avatarUrl ?? null) : null}
            isGrouped={shouldGroup(messages, index)}
            isStreaming={message.id === streamingMessageId}
          />
        ))}
        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {error && <div className={styles.errorBar}>{error}</div>}

      <ChatInput onSend={sendMessage} disabled={!!streamingMessageId} characterName={character?.name ?? "..."} />
    </div>
  );
}