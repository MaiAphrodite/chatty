"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { ChevronDownIcon, HashtagIcon } from "../ui/Icons";
import type { Conversation, Character } from "../../lib/types";
import styles from "./ContextSidebar.module.css";

type CharacterSidebarProps = {
  characterId: string;
  isSidebarOpen: boolean;
};

function useCharacterSidebarData(characterId: string, user: { id: string } | null) {
  const pathname = usePathname();
  const [character, setCharacter] = useState<Character | null>(null);
  const [historicalConvos, setHistoricalConvos] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;
    api.getConversations()
      .then((convos) => {
        const filtered = convos
          .filter((c) => c.characterId === characterId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setHistoricalConvos(filtered);

        if (filtered.length > 0 && filtered[0].character) {
          setCharacter(filtered[0].character as Character);
        } else {
          api.getCharacters().then((chars) => {
            const found = chars.find((c) => c.id === characterId);
            if (found) setCharacter(found);
          });
        }
      })
      .catch(console.error);
  }, [user, characterId, pathname]);

  return { character, historicalConvos };
}

function ConversationChannel({ conv, characterId, currentConvId }: {
  conv: Conversation;
  characterId: string;
  currentConvId: string | undefined;
}) {
  const isActive = currentConvId === conv.id;
  const titleStr = conv.title
    ? conv.title.toLowerCase().replace(/\s+/g, "-")
    : `chat-${new Date(conv.updatedAt).toLocaleDateString("en-US").replace(/\//g, "-")}`;

  return (
    <Link
      key={conv.id}
      href={`/chat/${characterId}?conv=${conv.id}`}
      className={`${styles.channelItem} ${isActive ? styles.active : ""}`}
    >
      <HashtagIcon />
      <span className={styles.channelName}>{titleStr}</span>
    </Link>
  );
}

export function CharacterSidebar({ characterId, isSidebarOpen }: CharacterSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentConvId = searchParams.get("conv") || undefined;
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const { character, historicalConvos } = useCharacterSidebarData(characterId, user);

  const sidebarStyle = {
    width: isSidebarOpen ? "var(--context-sidebar-width)" : 0,
    opacity: isSidebarOpen ? 1 : 0,
    borderRightWidth: isSidebarOpen ? 1 : 0,
    overflow: "hidden" as const,
  };

  return (
    <aside className={styles.sidebar} style={sidebarStyle}>
      <header className={styles.headerInteractive}>
        <h2 className={styles.serverTitle}>{character?.name ?? "Loading..."}</h2>
        <ChevronDownIcon />
      </header>

      <div className={styles.scroller}>
        <div
          className={`${styles.category} ${!isCategoryOpen ? styles.categoryClosed : ""}`}
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
        >
          <ChevronDownIcon />
          <span>CONVERSATION THREADS</span>
        </div>

        {isCategoryOpen && (
          <div className={styles.channelList}>
            <Link
              href={`/chat/${characterId}`}
              className={`${styles.channelItem} ${!currentConvId && pathname === `/chat/${characterId}` ? styles.active : ""}`}
            >
              <HashtagIcon />
              <span className={styles.channelName}>start-new-chat</span>
            </Link>

            {historicalConvos.map((conv) => (
              <ConversationChannel
                key={conv.id}
                conv={conv}
                characterId={characterId}
                currentConvId={currentConvId}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
