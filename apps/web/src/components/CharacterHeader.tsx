"use client";

import type { Character } from "../lib/types";
import styles from "./CharacterHeader.module.css";

type CharacterHeaderProps = {
  character: Character | null;
};

export function CharacterHeader({ character }: CharacterHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.atSign}>@</span>
        <span className={styles.name}>{character?.name ?? "Loading..."}</span>
        {character && <span className={styles.statusDot} />}
      </div>
    </header>
  );
}
