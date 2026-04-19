"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import type { Conversation } from "../lib/types";
import {
  ContinueIcon,
  DotsIcon,
  HashtagIcon,
  PlusIcon,
  XIcon,
} from "./ui/Icons";
import styles from "./CharacterMenu.module.css";

function ChatIcon() {
  return <ContinueIcon size={18} />;
}

function MemoryIcon() {
  return <HashtagIcon />;
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
        <DotsIcon size={20} />
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
              <PlusIcon size={18} />
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
                <XIcon size={18} />
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
