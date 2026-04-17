"use client";

import { useReducer, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import styles from "./ModelRail.module.css";

// ─── Model Config State ────────────────────────────────────────────────────────

type ModelConfig = {
  endpointOverride: string;
  systemPromptOverride: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  repPenalty: number;
  negativePrompt: string;
};

const CONFIG_DEFAULTS: ModelConfig = {
  endpointOverride: "",
  systemPromptOverride: "",
  temperature: 0.8,
  topP: 0.9,
  maxTokens: 2048,
  repPenalty: 1.1,
  negativePrompt: "",
};

type ConfigAction = { type: "SET"; key: keyof ModelConfig; value: string | number } | { type: "RESET" };

function configReducer(state: ModelConfig, action: ConfigAction): ModelConfig {
  if (action.type === "RESET") return CONFIG_DEFAULTS;
  return { ...state, [action.key]: action.value };
}

function loadConfig(characterId: string): ModelConfig {
  try {
    const raw = localStorage.getItem(`chatty:model-config:${characterId}`);
    if (!raw) return CONFIG_DEFAULTS;
    return { ...CONFIG_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return CONFIG_DEFAULTS;
  }
}

function saveConfig(characterId: string, config: ModelConfig) {
  localStorage.setItem(`chatty:model-config:${characterId}`, JSON.stringify(config));
}

export function useModelConfig(characterId: string | undefined) {
  const [config, dispatch] = useReducer(configReducer, CONFIG_DEFAULTS);

  useEffect(() => {
    if (!characterId) return;
    const saved = loadConfig(characterId);
    Object.entries(saved).forEach(([key, value]) => {
      dispatch({ type: "SET", key: key as keyof ModelConfig, value });
    });
  }, [characterId]);

  const set = useCallback((key: keyof ModelConfig, value: string | number) => {
    dispatch({ type: "SET", key, value });
    if (characterId) saveConfig(characterId, { ...config, [key]: value });
  }, [characterId, config]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    if (characterId) saveConfig(characterId, CONFIG_DEFAULTS);
  }, [characterId]);

  return { config, set, reset };
}

// ─── Rail Toggle Hook ──────────────────────────────────────────────────────────

const TOGGLE_EVENT = "chatty:toggle-model-rail";
const STORAGE_KEY = "chatty:model-rail-open";

function useModelRailOpen() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setIsOpen(true);

    const handle = () =>
      setIsOpen((prev) => {
        const next = !prev;
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    window.addEventListener(TOGGLE_EVENT, handle);
    return () => window.removeEventListener(TOGGLE_EVENT, handle);
  }, []);

  return isOpen;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderLabel}>
        <span>{label}</span>
        <span className={styles.sliderValue}>{value}</span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionHeader}>{children}</div>;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ModelRail() {
  const params = useParams();
  const characterId = params?.characterId as string | undefined;
  const isOpen = useModelRailOpen();
  const { config, set, reset } = useModelConfig(characterId);

  if (!characterId) return null;

  const panelStyle = {
    width: isOpen ? "var(--model-rail-width)" : 0,
    opacity: isOpen ? 1 : 0,
    borderLeftWidth: isOpen ? 1 : 0,
    overflow: "hidden" as const,
  };

  return (
    <aside className={styles.rail} style={panelStyle} aria-label="Model Settings">
      <header className={styles.header}>
        <span className={styles.headerTitle}>Model Config</span>
        <button className={styles.resetBtn} onClick={reset} title="Reset to defaults">Reset</button>
      </header>

      <div className={styles.scroller}>
        <SectionHeader>Endpoint Override</SectionHeader>
        <input
          type="text"
          className={styles.textInput}
          placeholder="https://… (leave blank for default)"
          value={config.endpointOverride}
          onChange={(e) => set("endpointOverride", e.target.value)}
        />

        <SectionHeader>System Prompt Override</SectionHeader>
        <textarea
          className={styles.textarea}
          placeholder="Prepend custom instructions for this session…"
          rows={4}
          value={config.systemPromptOverride}
          onChange={(e) => set("systemPromptOverride", e.target.value)}
        />

        <SectionHeader>Sampling</SectionHeader>
        <SliderRow label="Temperature" value={config.temperature} min={0} max={2} step={0.05} onChange={(v) => set("temperature", v)} />
        <SliderRow label="Top-P" value={config.topP} min={0} max={1} step={0.05} onChange={(v) => set("topP", v)} />
        <SliderRow label="Max Tokens" value={config.maxTokens} min={128} max={4096} step={64} onChange={(v) => set("maxTokens", v)} />
        <SliderRow label="Rep. Penalty" value={config.repPenalty} min={1.0} max={1.5} step={0.01} onChange={(v) => set("repPenalty", v)} />

        <SectionHeader>Negative Prompt</SectionHeader>
        <textarea
          className={styles.textarea}
          placeholder="Describe what the model should avoid…"
          rows={3}
          value={config.negativePrompt}
          onChange={(e) => set("negativePrompt", e.target.value)}
        />
      </div>
    </aside>
  );
}
