"use client";

import type { Message } from "../lib/types";
import styles from "./ChatBubble.module.css";

type ChatBubbleProps = {
  message: Message;
  isStreaming?: boolean;
};

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`${styles.row} ${isUser ? styles.userRow : styles.assistantRow}`}
    >
      <div
        className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble} animate-in`}
      >
        <div className={styles.content}>
          {message.content || (isStreaming ? "" : "...")}
        </div>
        {isStreaming && (
          <span className={styles.cursor} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
