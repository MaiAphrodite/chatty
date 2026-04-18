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

function findPredecessorId(messages: Message[], assistantId: string): string | null {
  const idx = messages.findIndex(m => m.id === assistantId);
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") return messages[i].id;
  }
  return null;
}

export default function ChatCharacterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const characterId = params.characterId as string | undefined;
  const convId = searchParams.get("conv") || undefined;

  const {
    messages, character, isLoading, streamingMessageId, error,
    variantGroups, activeVariants,
    sendMessage, deleteMessage, editMessage, regenerateMessage,
    continueMessage, rememberMessage, swipeVariant, dismissError,
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

  // Build the visible message list: only show the active variant per predecessor group
  const visibleMessages: Message[] = [];
  const seenAssistantGroups = new Set<string>();

  for (const message of messages) {
    if (message.role !== "assistant") {
      visibleMessages.push(message);
      continue;
    }

    // Find the predecessor group for this assistant message
    const predId = findPredecessorId(messages, message.id) ?? "__root__";
    if (seenAssistantGroups.has(predId)) continue; // already rendered this group
    seenAssistantGroups.add(predId);

    const variants = variantGroups.get(predId) ?? [message.id];
    const activeIdx = activeVariants.get(predId) ?? variants.length - 1;
    const activeId = variants[activeIdx];
    const activeMsg = messages.find(m => m.id === activeId) ?? message;
    visibleMessages.push(activeMsg);
  }

  return (
    <div className={styles.container}>
      <CharacterHeader character={character} />

      <div className={styles.messages}>
        {visibleMessages.length === 0 && <EmptyState character={character} />}

        {visibleMessages.map((message) => {
          const predId = message.role === "assistant"
            ? (findPredecessorId(messages, message.id) ?? "__root__")
            : null;

          const variants = predId ? (variantGroups.get(predId) ?? []) : [];
          const activeIdx = predId ? (activeVariants.get(predId) ?? 0) : 0;

          return (
            <MessageRow
              key={message.id}
              message={message}
              senderName={message.role === "assistant" ? (character?.name ?? "Assistant") : (user?.username ?? "You")}
              avatarUrl={message.role === "assistant" ? (character?.avatarUrl ?? null) : null}
              isStreaming={message.id === streamingMessageId}
              variantCount={variants.length}
              variantIndex={activeIdx}
              onSwipePrev={predId && activeIdx > 0 ? () => swipeVariant(predId, -1) : undefined}
              onSwipeNext={predId && activeIdx < variants.length - 1 ? () => swipeVariant(predId, 1) : undefined}
              onRegenerate={message.role === "assistant" ? () => regenerateMessage(predId) : undefined}
              onContinue={message.role === "assistant" ? continueMessage : undefined}
              onEdit={(newContent) => editMessage(message.id, newContent)}
              onDelete={() => deleteMessage(message.id)}
              onRemember={() => rememberMessage(message.id)}
            />
          );
        })}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {error && (
        <div className={styles.errorBar} onClick={dismissError} title="Click to dismiss">
          <span>{error}</span>
          <button className={styles.errorDismiss} onClick={dismissError} aria-label="Dismiss error">✕</button>
        </div>
      )}

      <ChatInput
        onSend={sendMessage}
        disabled={!!streamingMessageId}
        characterName={character?.name ?? "..."}
      />
    </div>
  );
}