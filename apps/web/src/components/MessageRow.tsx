"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../lib/types";
import styles from "./MessageRow.module.css";
import { RefreshCwIcon, ContinueIcon, EditIcon, TrashIcon, BookmarkIcon } from "./ui/Icons";

type MessageActions = {
  onRegenerate?: () => void;
  onContinue?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onRemember?: () => Promise<unknown>;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
};

type MessageRowProps = {
  message: Message;
  senderName: string;
  avatarUrl: string | null;
  isStreaming: boolean;
  variantCount?: number;
  variantIndex?: number;
} & MessageActions;

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StreamingIndicator({ hasContent }: { hasContent: boolean }) {
  if (!hasContent) return <span className={styles.typing}><span /><span /><span /></span>;
  return <span className={styles.cursor} />;
}

function MessageContent({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className={styles.content}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {isStreaming && <StreamingIndicator hasContent={!!content} />}
    </div>
  );
}

function EditArea({ content, onSave, onCancel }: { content: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(content);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className={styles.editArea}>
      <textarea
        ref={ref} className={styles.editTextarea}
        value={value} onChange={(e) => setValue(e.target.value)} rows={3}
      />
      <div className={styles.editActions}>
        <button className={styles.editSaveBtn} onClick={() => onSave(value)}>Save</button>
        <button className={styles.editCancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function SwipeNav({ index, total, onPrev, onNext, onRegenerate }: {
  index: number; total: number;
  onPrev?: () => void; onNext?: () => void; onRegenerate?: () => void;
}) {
  return (
    <div className={styles.swipeNav}>
      <button className={styles.swipeBtn} onClick={onPrev} disabled={!onPrev} title="Previous response">‹</button>
      <span className={styles.swipeCount}>{index + 1} / {total}</span>
      <button className={styles.swipeBtn} onClick={onNext} disabled={!onNext} title="Next response">›</button>
      {onRegenerate && (
        <button className={styles.swipeRegenBtn} onClick={onRegenerate} title="Generate new response">
          <RefreshCwIcon />
        </button>
      )}
    </div>
  );
}

function ActionBar({ isUser, onRegenerate, onContinue, onEdit, onDelete, onRemember, showRegenInSwipe }: {
  isUser: boolean;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemember?: () => Promise<unknown>;
  showRegenInSwipe?: boolean;
}) {
  const [remembered, setRemembered] = useState(false);

  const handleRemember = async () => {
    if (!onRemember || remembered) return;
    await onRemember();
    setRemembered(true);
    window.dispatchEvent(new Event("chatty:memory-updated"));
    setTimeout(() => setRemembered(false), 2000);
  };

  return (
    <div className={styles.actionsBar}>
      {!isUser && !showRegenInSwipe && onRegenerate && (
        <button className={styles.actionBtn} onClick={onRegenerate} title="Regenerate"><RefreshCwIcon /></button>
      )}
      {!isUser && onContinue && (
        <button className={styles.actionBtn} onClick={onContinue} title="Continue"><ContinueIcon /></button>
      )}
      {onRemember && (
        <button
          className={`${styles.actionBtn} ${remembered ? styles.actionBtnSuccess : ""}`}
          onClick={handleRemember} title={remembered ? "Remembered!" : "Remember this"}
        >
          <BookmarkIcon />
        </button>
      )}
      {onEdit && (
        <button className={styles.actionBtn} onClick={onEdit} title="Edit"><EditIcon /></button>
      )}
      {onDelete && (
        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={onDelete} title="Delete"><TrashIcon /></button>
      )}
    </div>
  );
}

export function MessageRow({
  message, senderName, avatarUrl, isStreaming,
  variantCount = 1, variantIndex = 0,
  onRegenerate, onContinue, onEdit, onDelete, onRemember,
  onSwipePrev, onSwipeNext,
}: MessageRowProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const hasVariants = variantCount > 1;

  const handleEditSave = (newContent: string) => { onEdit?.(newContent); setIsEditing(false); };
  const actionBarProps = {
    isUser,
    onRegenerate,
    onContinue,
    onEdit: onEdit ? () => setIsEditing(true) : undefined,
    onDelete,
    onRemember,
    showRegenInSwipe: hasVariants,
  };

  return (
    <div className={styles.row}>
      <div className={styles.gutter}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={senderName} className={styles.avatar} width={40} height={40} />
        ) : (
          <div className={`${styles.avatar} ${styles.avatarFallback}`}>
            {senderName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <span className={isUser ? styles.nameUser : styles.nameAssistant}>{senderName}</span>
          <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>
        </div>

        {isEditing
          ? <EditArea content={message.content} onSave={handleEditSave} onCancel={() => setIsEditing(false)} />
          : <MessageContent content={message.content} isStreaming={isStreaming} />
        }

        {!isStreaming && !isEditing && hasVariants && (
          <SwipeNav
            index={variantIndex}
            total={variantCount}
            onPrev={onSwipePrev}
            onNext={onSwipeNext}
            onRegenerate={onRegenerate}
          />
        )}
      </div>

      {!isStreaming && !isEditing && <ActionBar {...actionBarProps} />}
    </div>
  );
}
