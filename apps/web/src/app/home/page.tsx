"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import type { Character } from "../../lib/types";
import { ServerRail } from "../../components/Layout/ServerRail";
import { ContextSidebar } from "../../components/Layout/ContextSidebar";
import { CharacterModal } from "../../components/CharacterModal";
import { useLayout } from "../../hooks/useLayout";
import { HamburgerIcon } from "../../components/ui/Icons";
import styles from "./home.module.css";

function CreateModalHandler({ onOpen }: { onOpen: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      onOpen();
      router.replace("/home");
    }
  }, [searchParams, router, onOpen]);

  return null;
}

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCharacters = useCallback(() => {
    api
      .getCharacters()
      .then(setCharacters)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadCharacters();
  }, [user, authLoading, router, loadCharacters]);

  useEffect(() => {
    const handler = () => loadCharacters();
    window.addEventListener("characters:changed", handler);
    return () => window.removeEventListener("characters:changed", handler);
  }, [loadCharacters]);

  const handleCharacterClick = async (character: Character) => {
    try {
      await api.createConversation(character.id);
      router.push(`/chat/${character.id}`);
    } catch {
      console.error("Failed to start conversation");
    }
  };

  const { toggleSidebar } = useLayout();

  if (authLoading || isLoading) return <PageSpinner />;
  if (!user) return null;

  return (
    <>
      <div className={styles.shell}>
        <ServerRail />
        <ContextSidebar />
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.toggleBtn} onClick={toggleSidebar} title="Toggle Sidebar">
                <HamburgerIcon />
              </button>
              <h1 className={styles.topbarTitle}>Browse Characters</h1>
            </div>
          </header>

          <div className={styles.content}>
            {characters.length === 0 ? (
              <EmptyState />
            ) : (
              <div className={styles.grid}>
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className={styles.card}
                    onClick={() => handleCharacterClick(character)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleCharacterClick(character)}
                  >
                    {character.avatarUrl ? (
                      <img src={character.avatarUrl} alt={character.name} className={styles.cardAvatar} />
                    ) : (
                      <div className={styles.cardAvatarPlaceholder}>
                        {character.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={styles.cardBody}>
                      <h3 className={styles.cardName}>{character.name}</h3>
                      <p className={styles.cardDescription}>{character.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <Suspense>
        <CreateModalHandler onOpen={() => setShowCreateModal(true)} />
      </Suspense>

      {showCreateModal && (
        <CharacterModal
          mode="create"
          onSuccess={() => {
            setShowCreateModal(false);
            loadCharacters();
            window.dispatchEvent(new Event("characters:changed"));
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
        </svg>
      </div>
      <h2 className={styles.emptyTitle}>No characters yet</h2>
      <p className={styles.emptyText}>Create your first character to get started.</p>
    </div>
  );
}

function PageSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100dvh" }}>
      <div style={{
        width: 28, height: 28,
        border: "3px solid rgba(255,255,255,0.12)",
        borderTopColor: "#5865f2",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }} />
    </div>
  );
}