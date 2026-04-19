"use client";

import { useState, useEffect } from "react";
import {
  MOBILE_LAYOUT_MEDIA_QUERY,
  SET_MODEL_RAIL_EVENT,
  SET_SIDEBAR_EVENT,
  TOGGLE_SIDEBAR_EVENT,
  type PanelSetDetail,
} from "../lib/layout-events";

const STORAGE_KEY = "chatty:sidebar-state";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches;
}

function closeModelRailOnMobile(): void {
  if (!isMobileViewport()) return;
  window.dispatchEvent(new CustomEvent<PanelSetDetail>(SET_MODEL_RAIL_EVENT, { detail: { open: false } }));
}

export function useLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Restore from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsSidebarOpen(stored === "true");
      if (stored === "true") {
        closeModelRailOnMobile();
      }
    }

    const handleToggle = () => {
      setIsSidebarOpen((prev) => {
        const nextState = !prev;
        localStorage.setItem(STORAGE_KEY, String(nextState));
        if (nextState) {
          closeModelRailOnMobile();
        }
        return nextState;
      });
    };

    const handleSet = (event: Event) => {
      const customEvent = event as CustomEvent<PanelSetDetail>;
      const open = Boolean(customEvent.detail?.open);
      localStorage.setItem(STORAGE_KEY, String(open));
      if (open) {
        closeModelRailOnMobile();
      }
      setIsSidebarOpen(open);
    };

    window.addEventListener(TOGGLE_SIDEBAR_EVENT, handleToggle);
    window.addEventListener(SET_SIDEBAR_EVENT, handleSet);
    return () => {
      window.removeEventListener(TOGGLE_SIDEBAR_EVENT, handleToggle);
      window.removeEventListener(SET_SIDEBAR_EVENT, handleSet);
    };
  }, []);

  const toggleSidebar = () => {
    window.dispatchEvent(new Event(TOGGLE_SIDEBAR_EVENT));
  };

  const setSidebarOpen = (open: boolean) => {
    window.dispatchEvent(new CustomEvent<PanelSetDetail>(SET_SIDEBAR_EVENT, { detail: { open } }));
  };

  return { isSidebarOpen, toggleSidebar, setSidebarOpen };
}
