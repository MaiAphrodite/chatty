"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../lib/types";
import styles from "./MessageRow.module.css";

type MessageRowProps = {
  message: Message;
  senderName: string;
  avatarUrl: string | null;
  isGrouped: boolean;
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageRow({
  message,
  senderName,
  avatarUrl,
  isGrouped,
}: MessageRowProps) {
  const isUser = message.role === "user";

  if (isGrouped) {
    return (
      <div className={styles.row}>
        <div className={styles.gutterCompact}>
          <span className={styles.hoverTime}>{formatTime(message.createdAt)}</span>
        </div>
        <div className={styles.body}>
          <div className={styles.content}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && !message.content && (
              <span className={styles.typing}>
                <span />
                <span />
                <span />
              </span>
            )}
            {message.isStreaming && message.content && (
              <span className={styles.cursor} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <div className={styles.gutter}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={senderName}
            className={styles.avatar}
            width={40}
            height={40}
          />
        ) : (
          <div className={`${styles.avatar} ${styles.avatarFallback}`}>
            {senderName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={isUser ? styles.nameUser : styles.nameAssistant}>
            {senderName}
          </span>
          <span className={styles.timestamp}>
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className={styles.content}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
          {message.isStreaming && !message.content && (
            <span className={styles.typing}>
              <span />
              <span />
              <span />
            </span>
          )}
          {message.isStreaming && message.content && (
            <span className={styles.cursor} />
          )}
        </div>
      </div>
    </div>
  );
}
