"use client";

import { useParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useLayout } from "../../hooks/useLayout";
import { HomeSidebar } from "./HomeSidebar";
import { CharacterSidebar } from "./CharacterSidebar";

export function ContextSidebar() {
  const { user } = useAuth();
  const params = useParams();
  const { isSidebarOpen } = useLayout();

  if (!user) return null;

  const characterId = params?.characterId as string | undefined;

  if (!characterId) {
    return <HomeSidebar isSidebarOpen={isSidebarOpen} />;
  }

  return <CharacterSidebar characterId={characterId} isSidebarOpen={isSidebarOpen} />;
}
