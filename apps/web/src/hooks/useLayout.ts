"use client";

import { useState, useEffect } from "react";

const TOGGLE_EVENT = "chatty:toggle-sidebar";
const STORAGE_KEY = "chatty:sidebar-state";

export function useLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Restore from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsSidebarOpen(stored === "true");
    }

    const handleToggle = () => {
      setIsSidebarOpen((prev) => {
        const nextState = !prev;
        localStorage.setItem(STORAGE_KEY, String(nextState));
        return nextState;
      });
    };

    window.addEventListener(TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(TOGGLE_EVENT, handleToggle);
  }, []);

  const toggleSidebar = () => {
    window.dispatchEvent(new Event(TOGGLE_EVENT));
  };

  return { isSidebarOpen, toggleSidebar };
}
