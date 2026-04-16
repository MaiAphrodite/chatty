"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import type { Conversation } from "../../lib/types";
import styles from "./ServerRail.module.css";

import { HomeIcon, SettingsIcon } from "../ui/Icons";

export function ServerRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;
    api.getConversations().then(setConversations).catch(console.error);
  }, [user]);

  // Group by character ID to get unique characters (Servers)
  const uniqueConversations = Object.values(
    conversations.reduce<Record<string, Conversation>>((acc, conv) => {
      if (!acc[conv.characterId]) acc[conv.characterId] = conv;
      return acc;
    }, {})
  );

  const isOnHomePage = pathname === "/home" || pathname === "/";

  return (
    <nav className={styles.rail}>
      <div className={styles.scroller}>
        {/* Home Button */}
        <div className={styles.itemWrapper}>
          <div className={`${styles.pill} ${isOnHomePage ? styles.pillActive : ""}`} />
          <Link
            href="/home"
            className={`${styles.homeButton} ${isOnHomePage ? styles.active : ""}`}
            title="Direct Messages"
          >
            <HomeIcon />
          </Link>
        </div>

        <div className={styles.separator} />

        {/* Characters as Servers */}
        {uniqueConversations.map((conv) => {
          const char = conv.character;
          if (!char) return null;
          const isActive = pathname.startsWith(`/chat/${char.id}`);
          
          return (
            <div key={char.id} className={styles.itemWrapper}>
              <div 
                className={`${styles.pill} ${isActive ? styles.pillActive : styles.pillHover}`} 
              />
              <Link
                href={`/chat/${char.id}`}
                className={`${styles.serverIcon} ${isActive ? styles.active : ""}`}
                title={char.name}
              >
                {char.avatarUrl ? (
                  <img src={char.avatarUrl} alt={char.name} className={styles.avatar} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {char.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </div>
          );
        })}


      </div>

      <div className={styles.userContainer}>
        <div className={styles.itemWrapper}>
          <button className={styles.settingsButton} title="Settings">
            <SettingsIcon />
          </button>
        </div>
        <div className={styles.itemWrapper}>
          <div className={styles.userAvatar} title={user?.username}>
            {user?.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
}
