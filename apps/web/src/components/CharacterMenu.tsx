"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import type { Conversation } from "../lib/types";
import styles from "./CharacterMenu.module.css";

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MemoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a9 9 0 0 1 9 9v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1" />
      <path d="M12 13v7M9 16h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

type CharacterMenuProps = {
  characterId: string;
  characterName: string;
};

export function CharacterMenu({ characterId, characterName }: CharacterMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowMemory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = async () => {
    if (!isOpen) {
      try {
        const convos = await api.getConversations();
        setConversations(convos.filter((c) => c.characterId === characterId));
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleNewChat = async () => {
    try {
      await api.createConversation(characterId);
      router.push(`/chat/${characterId}`);
      window.location.reload();
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
    setIsOpen(false);
  };

  const handleSelectConversation = (convoId: string) => {
    router.push(`/chat/${characterId}?conv=${convoId}`);
    setIsOpen(false);
  };

  return (
    <div className={styles.menuButton} ref={menuRef} style={{ position: "relative" }}>
      <button onClick={handleToggle}>
        <DotsIcon />
      </button>

      {isOpen && (
        <>
          <div className={styles.menuOverlay} onClick={() => setIsOpen(false)} />
          <div className={styles.menuDropdown}>
            <button
              className={styles.menuItem}
              onClick={() => {
                setShowHistory(true);
                setIsOpen(false);
              }}
            >
              <ChatIcon />
              <span>Chat History</span>
            </button>

            <button className={styles.menuItem} onClick={handleNewChat}>
              <PlusIcon />
              <span>New Chat</span>
            </button>

            <button
              className={styles.menuItem}
              onClick={() => setShowMemory(!showMemory)}
            >
              <MemoryIcon />
              <span>Character Memory</span>
            </button>

            {showMemory && (
              <div className={styles.memorySection}>
                <div className={styles.memoryTitle}>Notes about {characterName}</div>
                <textarea
                  className={styles.memoryTextarea}
                  placeholder="Add notes about this character..."
                  value={memoryText}
                  onChange={(e) => setMemoryText(e.target.value)}
                />
                <p className={styles.memoryHint}>Changes are saved automatically</p>
              </div>
            )}
          </div>
        </>
      )}

      {showHistory && (
        <div className={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Chat History</span>
              <button
                className={styles.modalClose}
                onClick={() => setShowHistory(false)}
              >
                <CloseIcon />
              </button>
            </div>
            {conversations.length === 0 ? (
              <div className={styles.historyEmpty}>No chat history yet</div>
            ) : (
              conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={styles.historyItem}
                  onClick={() => handleSelectConversation(convo.id)}
                >
                  <div className={styles.historyDate}>
                    {new Date(convo.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className={styles.historyPreview}>
                    {convo.latestMessage?.content || "Empty conversation"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}