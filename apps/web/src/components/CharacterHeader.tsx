"use client";

import type { Character } from "../lib/types";
import { CharacterMenu } from "./CharacterMenu";
import { useLayout } from "../hooks/useLayout";
import styles from "./CharacterHeader.module.css";

import { HamburgerIcon } from "./ui/Icons";

type CharacterHeaderProps = { character: Character | null };

export function CharacterHeader({ character }: CharacterHeaderProps) {
  const { toggleSidebar } = useLayout();

  if (!character) return null;

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <button className={styles.toggleBtn} onClick={toggleSidebar} title="Toggle Sidebar">
          <HamburgerIcon />
        </button>
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className={styles.avatar}
            width={24}
            height={24}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={styles.atSign}>@</span>
        <span className={styles.name}>{character.name}</span>
        <span className={styles.statusDot} title="Online" />
      </div>
      <div className={styles.actions}>
        <CharacterMenu characterId={character.id} characterName={character.name} />
      </div>
    </header>
  );
}
