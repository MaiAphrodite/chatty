"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { ChevronDownIcon, HashtagIcon, PlusIcon, EditIcon, TrashIcon } from "../ui/Icons";
import type { Conversation, Character } from "../../lib/types";
import styles from "./ContextSidebar.module.css";
import localStyles from "./CharacterSidebar.module.css";

type CharacterSidebarProps = {
  characterId: string;
  isSidebarOpen: boolean;
};

// ─── Date label ───────────────────────────────────────────────────────────────

function formatConvDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return `Today ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useCharacterSidebarData(characterId: string, user: { id: string } | null) {
  const pathname = usePathname();
  const [character, setCharacter] = useState<Character | null>(null);
  const [convos, setConvos] = useState<Conversation[]>([]);

  const reload = () => {
    if (!user) return;
    api.getConversations()
      .then((all) => {
        const filtered = all
          .filter((c) => c.characterId === characterId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setConvos(filtered);
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
  };

  useEffect(reload, [user, characterId, pathname]);
  return { character, convos, reload };
}

// ─── Inline rename input ──────────────────────────────────────────────────────

function RenameInput({ value, onSave, onCancel }: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const commit = () => { if (draft.trim()) onSave(draft.trim()); else onCancel(); };

  return (
    <input
      ref={ref}
      className={localStyles.renameInput}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
      onBlur={commit}
    />
  );
}

// ─── Single conversation row ──────────────────────────────────────────────────

function ConvRow({ conv, characterId, currentConvId, onRenamed, onDeleted }: {
  conv: Conversation;
  characterId: string;
  currentConvId: string | undefined;
  onRenamed: (id: string, title: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isActive = currentConvId === conv.id;
  const label = conv.title && !conv.title.startsWith("Chat with ")
    ? conv.title
    : formatConvDate(conv.updatedAt);

  const handleSave = async (title: string) => {
    setIsRenaming(false);
    await api.renameConversation(conv.id, title).catch(console.error);
    onRenamed(conv.id, title);
  };

  const handleDelete = async () => {
    await api.deleteConversation(conv.id).catch(console.error);
    onDeleted(conv.id);
  };

  if (confirmDelete) {
    return (
      <div className={localStyles.deleteConfirm}>
        <span className={localStyles.deleteConfirmText}>Delete this conversation?</span>
        <div className={localStyles.deleteConfirmActions}>
          <button className={localStyles.deleteConfirmBtn} onClick={handleDelete}>Delete</button>
          <button className={localStyles.deleteConfirmCancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${localStyles.convRow} ${isActive ? localStyles.convRowActive : ""}`}>
      <HashtagIcon />
      {isRenaming ? (
        <RenameInput value={label} onSave={handleSave} onCancel={() => setIsRenaming(false)} />
      ) : (
        <Link
          href={`/chat/${characterId}?conv=${conv.id}`}
          className={localStyles.convLabel}
          title={label}
        >
          {label}
        </Link>
      )}
      {!isRenaming && (
        <div className={localStyles.convActions}>
          <button className={localStyles.convActionBtn} onClick={() => setIsRenaming(true)} title="Rename">
            <EditIcon size={12} />
          </button>
          <button className={`${localStyles.convActionBtn} ${localStyles.convActionBtnDanger}`} onClick={() => setConfirmDelete(true)} title="Delete">
            <TrashIcon size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CharacterSidebar({ characterId, isSidebarOpen }: CharacterSidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentConvId = searchParams.get("conv") || undefined;
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const { character, convos, reload } = useCharacterSidebarData(characterId, user);

  const sidebarStyle = {
    width: isSidebarOpen ? "var(--context-sidebar-width)" : 0,
    opacity: isSidebarOpen ? 1 : 0,
    borderRightWidth: isSidebarOpen ? 1 : 0,
    overflow: "hidden" as const,
  };

  const handleNewChat = async () => {
    const conv = await api.createConversation(characterId).catch(console.error);
    if (conv) { reload(); router.push(`/chat/${characterId}?conv=${conv.id}`); }
  };

  const handleRenamed = (id: string, title: string) => {
    // optimistic update: avoids a full reload for a label change
    reload();
  };

  const handleDeleted = (id: string) => {
    reload();
    if (currentConvId === id) router.push(`/chat/${characterId}`);
  };

  return (
    <aside className={styles.sidebar} style={sidebarStyle}>
      <header className={styles.headerInteractive}>
        <h2 className={styles.serverTitle}>{character?.name ?? "Loading..."}</h2>
        <button className={localStyles.newChatBtn} onClick={handleNewChat} title="New conversation">
          <PlusIcon size={16} />
        </button>
      </header>

      <div className={styles.scroller}>
        <div
          className={`${styles.category} ${!isCategoryOpen ? styles.categoryClosed : ""}`}
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
        >
          <ChevronDownIcon />
          <span>HISTORY</span>
        </div>

        {isCategoryOpen && (
          <div className={styles.channelList}>
            {convos.length === 0 && (
              <p className={localStyles.emptyHint}>No conversations yet.</p>
            )}
            {convos.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                characterId={characterId}
                currentConvId={currentConvId}
                onRenamed={handleRenamed}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
