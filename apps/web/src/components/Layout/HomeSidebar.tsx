"use client";

import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Character } from "../../lib/types";
import { CharacterModal } from "../CharacterModal";
import { PlusIcon, EditIcon, TrashIcon, GlobeIcon, LockIcon } from "../ui/Icons";
import styles from "./ContextSidebar.module.css";
import ownStyles from "./HomeSidebar.module.css";

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; character: Character };

type DeleteState =
  | { pending: false }
  | { pending: true; characterId: string; name: string };

type HomeSidebarProps = {
  isSidebarOpen: boolean;
};

function useMyCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);

  const refresh = () => {
    api.getMyCharacters().then(setCharacters).catch(console.error);
  };

  useEffect(() => {
    refresh();

    const handler = () => refresh();
    window.addEventListener("characters:changed", handler);
    return () => window.removeEventListener("characters:changed", handler);
  }, []);

  return { characters, refresh };
}

function emitCharactersChanged() {
  window.dispatchEvent(new Event("characters:changed"));
}

export function HomeSidebar({ isSidebarOpen }: HomeSidebarProps) {
  const { characters, refresh } = useMyCharacters();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ pending: false });
  const [isDeleting, setIsDeleting] = useState(false);

  const sidebarStyle = {
    width: isSidebarOpen ? "var(--context-sidebar-width)" : 0,
    opacity: isSidebarOpen ? 1 : 0,
    borderRightWidth: isSidebarOpen ? 1 : 0,
    overflow: "hidden" as const,
  };

  const handleModalSuccess = () => {
    setModal({ open: false });
    refresh();
    emitCharactersChanged();
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.deleteCharacter(id);
      setDeleteState({ pending: false });
      refresh();
      emitCharactersChanged();
    } catch {
      // keep confirm showing on error
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <aside className={styles.sidebar} style={sidebarStyle}>
        <header className={styles.header}>
          <span className={ownStyles.headerTitle}>Characters</span>
        </header>

        <div className={styles.scroller}>
          <button
            className={styles.createButton}
            onClick={() => setModal({ open: true, mode: "create" })}
          >
            <PlusIcon size={20} />
            <span>Create New Character</span>
          </button>

          {characters.length > 0 && (
            <>
              <div className={ownStyles.sectionLabel}>MY CHARACTERS</div>

              {characters.map((char) => (
                <div key={char.id} className={ownStyles.characterRow}>
                  <div className={ownStyles.charAvatar}>
                    {char.avatarUrl ? (
                      <img src={char.avatarUrl} alt={char.name} className={ownStyles.charAvatarImg} />
                    ) : (
                      <span>{char.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <span className={ownStyles.charName}>{char.name}</span>

                  <span
                    className={`${ownStyles.visibilityTag} ${char.isPublic ? ownStyles.visibilityTagPublic : ownStyles.visibilityTagPrivate}`}
                    title={char.isPublic ? "Public" : "Private"}
                  >
                    {char.isPublic ? <GlobeIcon /> : <LockIcon />}
                    {char.isPublic ? "public" : "private"}
                  </span>

                  <div className={ownStyles.charActions}>
                    <button
                      className={ownStyles.iconBtn}
                      title="Edit character"
                      onClick={() => setModal({ open: true, mode: "edit", character: char })}
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      className={`${ownStyles.iconBtn} ${ownStyles.iconBtnDanger}`}
                      title="Delete character"
                      onClick={() => setDeleteState({ pending: true, characterId: char.id, name: char.name })}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {deleteState.pending && (
                <div className={ownStyles.deleteConfirm}>
                  <p className={ownStyles.deleteConfirmText}>
                    Delete <strong>{deleteState.name}</strong>? This removes all conversations.
                  </p>
                  <div className={ownStyles.deleteConfirmActions}>
                    <button
                      className={ownStyles.deleteConfirmBtn}
                      onClick={() => handleDelete(deleteState.characterId)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      className={ownStyles.deleteConfirmCancelBtn}
                      onClick={() => setDeleteState({ pending: false })}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {modal.open && (
        <CharacterModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.character : undefined}
          onSuccess={handleModalSuccess}
          onClose={() => setModal({ open: false })}
        />
      )}
    </>
  );
}
