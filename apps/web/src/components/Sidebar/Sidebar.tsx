"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import type { Conversation } from "../../lib/types";
import styles from "./Sidebar.module.css";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l9 7.5v9h-6v-6h-6v6h-6v-9l9-7.5z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4v16m-8-8h16" strokeWidth="2" stroke="currentColor" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarExpanded");
    if (saved !== null) {
      setExpanded(saved === "true");
    } else if (typeof window !== "undefined" && window.innerWidth < 768) {
      setExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setExpanded(false);
    }
  }, []);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    localStorage.setItem("sidebarExpanded", String(newExpanded));
  };

  useEffect(() => {
    if (!user) return;
    api.getConversations().then(setConversations).catch(console.error);
  }, [user]);

  const uniqueByChar = conversations.reduce((acc, conv) => {
    if (!acc[conv.characterId]) {
      acc[conv.characterId] = conv;
    }
    return acc;
  }, {} as Record<string, Conversation>);

  const uniqueConversations = Object.values(uniqueByChar);
  const isOnChatPage = pathname.startsWith("/chat");
  const isOnHomePage = pathname === "/home" || pathname === "/";

  return (
    <aside
      className={`${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed}`}
    >
      <button className={styles.collapseButton} onClick={handleToggle}>
        <ChevronIcon />
      </button>

      <nav className={styles.navSection}>
        <Link
          href="/home"
          className={`${styles.navItem} ${isOnHomePage ? styles.active : ""}`}
        >
          <span className={styles.navIcon}>
            <HomeIcon />
          </span>
          <span className={styles.navLabel}>Home</span>
        </Link>
      </nav>

      <div className={styles.separator} />

      <div className={styles.conversationSection}>
        {uniqueConversations.map((conv) => {
          const char = conv.character;
          const isActive = pathname === `/chat/${char?.id}`;
          return (
            <Link
              key={conv.id}
              href={`/chat/${char?.id}`}
              className={`${styles.conversationItem} ${isActive ? styles.active : ""}`}
            >
              {char?.avatarUrl ? (
                <img
                  src={char.avatarUrl}
                  alt={char.name}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {char?.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <span className={styles.conversationName}>
                {char?.name || "Unknown"}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}