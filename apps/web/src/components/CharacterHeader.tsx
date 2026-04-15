"use client";

import type { Character } from "../lib/types";
import { CharacterMenu } from "./CharacterMenu";
import styles from "./CharacterHeader.module.css";

type CharacterHeaderProps = {
  character: Character | null;
};

export function CharacterHeader({ character }: CharacterHeaderProps) {
  if (!character) return null;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.atSign}>@</span>
        <span className={styles.name}>{character.name}</span>
        <span className={styles.statusDot} />
        <div className={styles.rightSection}>
          <CharacterMenu characterId={character.id} characterName={character.name} />
        </div>
      </div>
    </header>
  );
}
