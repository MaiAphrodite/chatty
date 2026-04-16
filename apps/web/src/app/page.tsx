"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/home" : "/login");
  }, [user, isLoading, router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        color: "var(--text-muted)",
      }}
    >
      <div className="spinner" style={{
        width: 32,
        height: 32,
        border: "3px solid var(--border-medium)",
        borderTopColor: "var(--accent-primary)",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }} />
    </div>
  );
}
