"use client";

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ContinueIcon } from "./ui/Icons";
import styles from "./ChatInput.module.css";

type ChatInputProps = {
  onSend: (content: string) => void;
  disabled: boolean;
  characterName: string;
};

export function ChatInput({ onSend, disabled, characterName }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.container} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          id="chat-input"
          className={styles.textarea}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={`Message @${characterName}`}
          rows={1}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <ContinueIcon size={20} />
        </button>
      </form>
    </div>
  );
}
