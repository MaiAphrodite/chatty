"use client";

import type { Character } from "../lib/types";
import { CharacterMenu } from "./CharacterMenu";
import { useLayout } from "../hooks/useLayout";
import styles from "./CharacterHeader.module.css";

import { HamburgerIcon, SlidersIcon } from "./ui/Icons";

const MODEL_RAIL_EVENT = "chatty:toggle-model-rail";

type CharacterHeaderProps = { character: Character | null };

export function CharacterHeader({ character }: CharacterHeaderProps) {
  const { toggleSidebar } = useLayout();

  if (!character) return null;

  const toggleModelRail = () => window.dispatchEvent(new Event(MODEL_RAIL_EVENT));

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
            width={32}
            height={32}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={styles.name}>{character.name}</span>
        <span className={styles.statusDot} title="Online" />
      </div>
      <div className={styles.actions}>
        <button className={styles.toggleBtn} onClick={toggleModelRail} title="Model Settings">
          <SlidersIcon />
        </button>
        <CharacterMenu characterId={character.id} characterName={character.name} />
      </div>
    </header>
  );
}
