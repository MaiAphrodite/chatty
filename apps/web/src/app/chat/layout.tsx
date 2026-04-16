"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { ServerRail } from "../../components/Layout/ServerRail";
import { ContextSidebar } from "../../components/Layout/ContextSidebar";
import styles from "./chat.module.css";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    } else if (user && pathname === "/chat") {
      router.replace("/home");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className={styles.shell}>
      <ServerRail />
      <ContextSidebar />
      <div className={styles.chatContent}>{children}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} />
    </div>
  );
}
