"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { useChat } from "../../../hooks/useChat";
import { CharacterHeader } from "../../../components/CharacterHeader";
import { MessageRow } from "../../../components/MessageRow";
import { ChatInput } from "../../../components/ChatInput";
import type { Message } from "../../../lib/types";
import styles from "../chat.module.css";

function shouldGroup(messages: Message[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (prev.role !== curr.role) return false;
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap < 5 * 60 * 1000;
}

function EmptyState({ character }: { character: { avatarUrl?: string | null; name?: string; description?: string } | null }) {
  return (
    <div className={styles.empty}>
      {character?.avatarUrl && (
        <img src={character.avatarUrl} alt={character.name} className={styles.emptyAvatar} width={80} height={80} />
      )}
      <h2 className={styles.emptyTitle}>{character?.name}</h2>
      <p className={styles.emptySubtitle}>{character?.description}</p>
      <p className={styles.emptyHint}>This is the start of your conversation.</p>
    </div>
  );
}

export default function ChatCharacterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const characterId = params.characterId as string | undefined;
  const convId = searchParams.get("conv") || undefined;

  const {
    messages, character, isLoading, streamingMessageId, error,
    sendMessage, deleteMessage, editMessage, continueMessage, rememberMessage,
  } = useChat({ characterId, conversationId: convId });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingDots}><span /><span /><span /></div>
      </div>
    );
  }

  const handleRegenerate = (index: number) => {
    const userMsg = [...messages].slice(0, index).reverse().find((m) => m.role === "user");
    if (userMsg) sendMessage(userMsg.content);
  };

  return (
    <div className={styles.container}>
      <CharacterHeader character={character} />

      <div className={styles.messages}>
        {messages.length === 0 && <EmptyState character={character} />}

        {messages.map((message, index) => (
          <MessageRow
            key={message.id}
            message={message}
            senderName={message.role === "assistant" ? (character?.name ?? "Assistant") : (user?.username ?? "You")}
            avatarUrl={message.role === "assistant" ? (character?.avatarUrl ?? null) : null}
            isGrouped={shouldGroup(messages, index)}
            isStreaming={message.id === streamingMessageId}
            onRegenerate={message.role === "assistant" ? () => handleRegenerate(index) : undefined}
            onContinue={message.role === "assistant" ? continueMessage : undefined}
            onEdit={(newContent) => editMessage(message.id, newContent)}
            onDelete={() => deleteMessage(message.id)}
            onRemember={() => rememberMessage(message.id)}
          />
        ))}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {error && <div className={styles.errorBar}>{error}</div>}

      <ChatInput
        onSend={sendMessage}
        disabled={!!streamingMessageId}
        characterName={character?.name ?? "..."}
      />
    </div>
  );
}