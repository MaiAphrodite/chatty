"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import type { Character } from "../../lib/types";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import styles from "./home.module.css";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    api
      .getCharacters()
      .then(setCharacters)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user, authLoading, router]);

  const handleCharacterClick = async (character: Character) => {
    try {
      const conv = await api.createConversation(character.id);
      router.push(`/chat/${character.id}`);
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border-medium)",
            borderTopColor: "var(--accent-primary)",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Sidebar />
      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Characters</h1>
          <p className={styles.subtitle}>Choose a character to chat with</p>
        </header>

        {characters.length === 0 ? (
          <div className={styles.empty}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-full)",
                background: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
              >
                <circle cx={12} cy={12} r={10} />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>No characters yet</h2>
            <p className={styles.emptyText}>
              Characters will appear here once they are added.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {characters.map((character) => (
              <div
                key={character.id}
                className={styles.card}
                onClick={() => handleCharacterClick(character)}
              >
                {character.avatarUrl ? (
                  <img
                    src={character.avatarUrl}
                    alt={character.name}
                    className={styles.cardAvatar}
                  />
                ) : (
                  <div className={styles.cardAvatarPlaceholder}>
                    {character.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className={styles.cardName}>{character.name}</h3>
                <p className={styles.cardDescription}>{character.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}