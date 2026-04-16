"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import styles from "../chat.module.css";

export default function ChatCharacterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "var(--bg-secondary)",
        }}
      >
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
    <div className={styles.chatContent}>
      {children}
    </div>
  );
}