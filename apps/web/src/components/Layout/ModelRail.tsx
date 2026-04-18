"use client";

import { useReducer, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import type { MemoryFact, MemorySummary, Character, SummaryEditorState } from "../../lib/types";
import { useAuth } from "../../contexts/AuthContext";
import { DatabaseIcon, MessagesSquareIcon, XIcon } from "@/components/ui/Icons";
import styles from "./ModelRail.module.css";

// ─── Local Sampling Config ─────────────────────────────────────────────────────

type ModelConfig = {
  systemPromptOverride: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  repPenalty: number;
  negativePrompt: string;
};

const CONFIG_DEFAULTS: ModelConfig = {
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
    const parsed = JSON.parse(raw);
    delete parsed.endpointOverride;
    return { ...CONFIG_DEFAULTS, ...parsed };
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
const MEMORY_UPDATED_EVENT = "chatty:memory-updated";

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

// ─── Shared Sub-components ─────────────────────────────────────────────────────

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) {
  return (
    <details className={styles.detailsGroup} open={defaultOpen}>
      <summary className={styles.sectionHeader}>{title}</summary>
      <div className={styles.detailsContent}>{children}</div>
    </details>
  );
}

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
        type="range" className={styles.slider}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ─── Connection Status Indicator ───────────────────────────────────────────────

type ConnectionStatus = "idle" | "testing" | "success" | "error";

function ConnectionStatusIndicator({ status, modelCount, error }: {
  status: ConnectionStatus; modelCount: number; error: string | null;
}) {
  if (status === "success") {
    return <span className={styles.statusSuccess}>Connected — {modelCount} models found</span>;
  }
  if (status === "error") {
    return <span className={styles.statusError}>{error}</span>;
  }
  return null;
}

// ─── Model Selector ────────────────────────────────────────────────────────────

function ModelSelector({ models, value, onChange }: {
  models: string[]; value: string; onChange: (v: string) => void;
}) {
  if (models.length > 0) {
    return (
      <select className={styles.textInput} value={value} onChange={(e) => onChange(e.target.value)}>
        {!value && <option value="">Select a model…</option>}
        {models.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    );
  }
  return (
    <input
      type="text" className={styles.textInput}
      placeholder="e.g. gpt-4" value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── Global API Settings ───────────────────────────────────────────────────────

type ApiPreset = {
  id: string;
  name: string;
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
};

function useApiPresets() {
  const [presets, setPresets] = useState<ApiPreset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chatty:api-presets");
      if (stored) setPresets(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const savePreset = useCallback((name: string, payload: Omit<ApiPreset, "id" | "name">) => {
    setPresets((prev) => {
      const existing = prev.find(p => p.name.toLowerCase() === name.toLowerCase());
      let next;
      if (existing) {
        next = prev.map(p => p.id === existing.id ? { ...p, ...payload } : p);
      } else {
        next = [...prev, { id: crypto.randomUUID(), name, ...payload }];
      }
      localStorage.setItem("chatty:api-presets", JSON.stringify(next));
      return next;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem("chatty:api-presets", JSON.stringify(next));
      return next;
    });
  }, []);

  return { presets, savePreset, deletePreset };
}

function useApiSettingsState() {
  const { user, refreshUser } = useAuth();

  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const { presets, savePreset, deletePreset } = useApiPresets();

  useEffect(() => {
    if (!user) return;
    setLlmEndpoint(user.llmEndpoint || "");
    setLlmApiKey(user.llmApiKey || "");
    setLlmModel(user.llmModel || "");
  }, [user]);

  const testConnection = useCallback(async () => {
    const url = llmEndpoint.trim();
    if (!url) return;
    setConnectionStatus("testing");
    setConnectionError(null);
    setAvailableModels([]);

    try {
      const result = await api.testConnection(url, llmApiKey.trim() || undefined);
      if (result.ok) {
        setConnectionStatus("success");
        setAvailableModels(result.models);
        if (result.models.length > 0) {
          if (!llmModel || !result.models.includes(llmModel)) {
            setLlmModel(result.models[0] || "");
          }
        }
      } else {
        setConnectionStatus("error");
        setConnectionError(result.error || "Connection failed");
      }
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(err instanceof Error ? err.message : "Connection test failed");
    }
  }, [llmEndpoint, llmApiKey, llmModel]);

  const saveSettings = useCallback(async () => {
    setIsSubmitting(true);
    setSaveSuccess(false);
    try {
      await api.updateUserSettings({
        llmEndpoint: llmEndpoint.trim() || null,
        llmApiKey: llmApiKey.trim() || null,
        llmModel: llmModel.trim() || null,
      });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setConnectionStatus("error");
      setConnectionError("Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  }, [llmEndpoint, llmApiKey, llmModel, refreshUser]);

  const resetStatus = useCallback(() => setConnectionStatus("idle"), []);

  return {
    llmEndpoint, setLlmEndpoint,
    llmApiKey, setLlmApiKey,
    llmModel, setLlmModel,
    connectionStatus, availableModels, connectionError,
    isSubmitting, saveSuccess,
    presets, savePreset, deletePreset,
    testConnection, saveSettings, resetStatus,
  };
}

function GlobalApiSettings() {
  const s = useApiSettingsState();
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    s.savePreset(presetName.trim(), {
      llmEndpoint: s.llmEndpoint,
      llmApiKey: s.llmApiKey,
      llmModel: s.llmModel,
    });
    setPresetName("");
    setShowSavePreset(false);
  };

  return (
    <div className={styles.apiSettingsGroup}>
      {showSavePreset ? (
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Preset Name</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input 
              type="text" className={styles.textInput} 
              autoFocus placeholder="e.g. Local Ollama"
              value={presetName} onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePreset();
                if (e.key === 'Escape') setShowSavePreset(false);
              }}
            />
            <button className={styles.resetBtn} style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} onClick={handleSavePreset}>Save</button>
            <button className={styles.resetBtn} onClick={() => setShowSavePreset(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {s.presets.length > 0 && (
            <div className={styles.fieldGroup}>
              <div className={styles.sliderLabel}>
                <span>Saved Presets</span>
                <button className={styles.resetBtn} onClick={() => setShowSavePreset(true)}>Save Current</button>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select 
                  className={styles.textInput} 
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const p = s.presets.find(p => p.id === e.target.value);
                    if (p) {
                      s.setLlmEndpoint(p.llmEndpoint);
                      s.setLlmApiKey(p.llmApiKey);
                      s.setLlmModel(p.llmModel);
                      s.resetStatus();
                    }
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Load a preset...</option>
                  {s.presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {s.presets.length === 0 && (
            <div className={styles.fieldGroup}>
              <button className={styles.addFactBtn} onClick={() => setShowSavePreset(true)}>+ Save Current as Preset</button>
            </div>
          )}
        </>
      )}
      
      <div className={styles.divider} style={{ margin: '8px 0' }} />

      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>API Endpoint URL</span>
        <input
          type="text" className={styles.textInput}
          placeholder="https://api.openai.com/v1"
          value={s.llmEndpoint}
          onChange={(e) => { s.setLlmEndpoint(e.target.value); s.resetStatus(); }}
        />
      </div>

      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>API Key</span>
        <input
          type="password" className={styles.textInput}
          placeholder="sk-..."
          value={s.llmApiKey}
          onChange={(e) => { s.setLlmApiKey(e.target.value); s.resetStatus(); }}
        />
      </div>

      <button
        className={styles.testBtn}
        onClick={s.testConnection}
        disabled={!s.llmEndpoint.trim() || s.connectionStatus === "testing"}
      >
        {s.connectionStatus === "testing" ? "Testing…" : "🔌 Test Connection"}
      </button>

      <ConnectionStatusIndicator
        status={s.connectionStatus}
        modelCount={s.availableModels.length}
        error={s.connectionError}
      />

      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>Active Model</span>
        <ModelSelector
          models={s.availableModels}
          value={s.llmModel}
          onChange={s.setLlmModel}
        />
      </div>

      <button
        className={styles.saveGlobalBtn}
        onClick={s.saveSettings}
        disabled={s.isSubmitting}
      >
        {s.isSubmitting ? "Saving..." : s.saveSuccess ? "Saved ✓" : "Save Global Settings"}
      </button>
    </div>
  );
}

// ─── Context Stats Panel ───────────────────────────────────────────────────────

type ContextStats = { messageCount: number; estimatedTokens: number; memoryTokens: number };

const CONTEXT_WINDOW_ESTIMATE = 8192; // conservative cross-model default

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={styles.tokenBar}>
      <div className={styles.tokenBarFill} style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function ContextStatsPanel({ conversationId }: { conversationId: string }) {
  const [stats, setStats] = useState<ContextStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getContextStats(conversationId);
      setStats(data);
    } catch { /* non-critical */ }
  }, [conversationId]);

  useEffect(() => {
    refresh();
    window.addEventListener(MEMORY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MEMORY_UPDATED_EVENT, refresh);
  }, [refresh]);

  if (!stats) return <span className={styles.contextHint}>Loading stats…</span>;

  const chatPct = Math.min(100, (stats.estimatedTokens / CONTEXT_WINDOW_ESTIMATE) * 100);
  const memColor = stats.memoryTokens / CONTEXT_WINDOW_ESTIMATE > 0.15 ? "var(--error)" : "var(--accent-secondary, #a78bfa)";

  return (
    <div className={styles.statsPanel}>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Messages</span>
        <span className={styles.statValue}>{stats.messageCount}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Chat tokens (est.)</span>
        <span className={styles.statValue} style={{ color: chatPct > 85 ? "var(--error)" : undefined }}>
          ~{stats.estimatedTokens.toLocaleString()} / {CONTEXT_WINDOW_ESTIMATE.toLocaleString()}
        </span>
      </div>
      <StatBar value={stats.estimatedTokens} max={CONTEXT_WINDOW_ESTIMATE} color="var(--accent-primary)" />
      <div className={styles.statRow} style={{ marginTop: 6 }}>
        <span className={styles.statLabel}>Memory tokens</span>
        <span className={styles.statValue}>~{stats.memoryTokens.toLocaleString()}</span>
      </div>
      <StatBar value={stats.memoryTokens} max={CONTEXT_WINDOW_ESTIMATE} color={memColor} />
    </div>
  );
}

// ─── Memory Toggle ─────────────────────────────────────────────────────────────

function MemoryModeToggle({ character, characterId }: {
  character: Character; characterId: string;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState(character.memoryMode);
  const isOwner = user?.id === character.creatorId;

  if (!isOwner) return null;

  const handleToggle = async () => {
    const newMode = mode === "auto" ? "manual" : "auto";
    await api.updateCharacter(characterId, { memoryMode: newMode });
    setMode(newMode);
  };

  return (
    <label className={styles.memoryToggle}>
      <input type="checkbox" checked={mode === "auto"} onChange={handleToggle} />
      <span>Auto-Extract Memories</span>
    </label>
  );
}

// ─── Fact Row ──────────────────────────────────────────────────────────────────

function FactRow({ fact, onEdit, onDelete }: {
  fact: MemoryFact;
  onEdit: (id: string, predicate: string, target: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={styles.factRow}>
      <span className={styles.factText}>
        <strong>{fact.source}</strong>{" "}
        {fact.predicate.replace(/_/g, " ")}{" "}
        <strong>{fact.target}</strong>
      </span>
      <div className={styles.factActions}>
        <button className={styles.factBtn} onClick={() => onEdit(fact.id, fact.predicate, fact.target)} title="Edit">✏️</button>
        <button className={styles.factBtn} onClick={() => onDelete(fact.id)} title="Delete">🗑</button>
      </div>
    </div>
  );
}

function FactEditRow({ fact, onSave, onCancel }: {
  fact: MemoryFact;
  onSave: (id: string, predicate: string, target: string) => void;
  onCancel: () => void;
}) {
  const [predicate, setPredicate] = useState(fact.predicate);
  const [target, setTarget] = useState(fact.target);

  return (
    <div className={styles.factRow}>
      <div className={styles.factEditRow}>
        <span className={styles.factSource}>{fact.source}</span>
        <input className={styles.factEditInput} value={predicate} onChange={(e) => setPredicate(e.target.value)} placeholder="predicate" />
        <input className={styles.factEditInput} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target" />
        <button className={styles.factSaveBtn} onClick={() => onSave(fact.id, predicate, target)}>✓</button>
        <button className={styles.factCancelBtn} onClick={onCancel}>✕</button>
      </div>
    </div>
  );
}

// ─── Add Fact Form ─────────────────────────────────────────────────────────────

function AddFactForm({ conversationId, onAdded, onCancel }: {
  conversationId: string; onAdded: () => void; onCancel: () => void;
}) {
  const [source, setSource] = useState("User");
  const [predicate, setPredicate] = useState("");
  const [target, setTarget] = useState("");

  const handleAdd = async () => {
    if (!predicate.trim() || !target.trim()) return;
    await api.addMemory(conversationId, source.trim(), predicate.trim(), target.trim());
    onAdded();
  };

  return (
    <div className={styles.addFactForm}>
      <input className={styles.factEditInput} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Subject (e.g. User)" />
      <input className={styles.factEditInput} value={predicate} onChange={(e) => setPredicate(e.target.value)} placeholder="predicate (e.g. likes)" />
      <input className={styles.factEditInput} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="object (e.g. cats)" />
      <div className={styles.addFactActions}>
        <button className={styles.factSaveBtn} onClick={handleAdd}>Add</button>
        <button className={styles.factCancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function SummaryEditorModal({
  isOpen,
  conversationId,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  conversationId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [state, setState] = useState<SummaryEditorState | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoMode, setAutoMode] = useState<"delta" | "full" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSummaryEditor(conversationId);
      setState(data);
      setSummaryDraft(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary editor");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!isOpen) return;
    loadState();
  }, [isOpen, loadState]);

  if (!isOpen || !conversationId) return null;

  const autoSummarize = async (mode: "delta" | "full") => {
    setAutoMode(mode);
    setError(null);
    try {
      const next = await api.autoSummarizeMemory(conversationId, mode);
      setState(next);
      setSummaryDraft(next.summary);
      window.dispatchEvent(new Event(MEMORY_UPDATED_EVENT));
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto summary failed");
    } finally {
      setAutoMode(null);
    }
  };

  const saveSummary = async () => {
    if (!summaryDraft.trim()) {
      setError("Summary cannot be empty");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const saved = await api.saveSummary(conversationId, summaryDraft);
      setState(saved);
      setSummaryDraft(saved.summary);
      window.dispatchEvent(new Event(MEMORY_UPDATED_EVENT));
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save summary");
    } finally {
      setIsSaving(false);
    }
  };

  const updatedMeta = state?.updatedAt
    ? `You have updated the chat summary around ~${state.messagesSinceUpdate} messages (${state.deltaTokenEstimate} tokens) ago.`
    : "No summary saved yet. Auto-summary can generate one from your knowledge graph.";
  const deltaMeta = state
    ? `${state.deltaFactCount} new facts detected since last summary`
    : "";

  const modal = (
    <div className={styles.summaryBackdrop} onClick={onClose}>
      <div
        className={styles.summaryModal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
      >
        <div className={styles.summaryHeader}>
          <h2 id="summary-modal-title" className={styles.summaryTitle}>Summary of this chat</h2>
          <button className={styles.summaryCloseBtn} onClick={onClose} aria-label="Close">
            <XIcon size={16} />
          </button>
        </div>

        <div className={styles.summaryBody}>
          <p className={styles.summaryHint}>
            Enter a summary for your chat. This will be included into the prompt as long-term memory.
          </p>
          <p className={styles.summaryMetaLine}>{updatedMeta}</p>
          {deltaMeta && <p className={styles.summaryMetaLine}>{deltaMeta}</p>}

          {isLoading ? (
            <div className={styles.summaryLoading}>Loading summary…</div>
          ) : (
            <>
              <textarea
                className={styles.summaryTextarea}
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
                rows={9}
                placeholder="No summary yet. Click one of the auto-summary buttons below to generate one."
              />

              <div className={styles.summaryActionsStack}>
                <button
                  className={styles.summaryAutoBtn}
                  onClick={() => autoSummarize("delta")}
                  disabled={isSaving || autoMode !== null}
                >
                  {autoMode === "delta" ? "Generating…" : "Auto Summary (Since last updated)"}
                </button>
                <button
                  className={styles.summaryAutoBtn}
                  onClick={() => autoSummarize("full")}
                  disabled={isSaving || autoMode !== null}
                >
                  {autoMode === "full" ? "Generating…" : "Auto Summary (As far as possible)"}
                </button>
              </div>
            </>
          )}

          {error && <div className={styles.summaryError}>{error}</div>}
        </div>

        <div className={styles.summaryFooter}>
          <button className={styles.summaryCancelBtn} onClick={onClose} disabled={isSaving || autoMode !== null}>Cancel</button>
          <button className={styles.summarySaveBtn} onClick={saveSummary} disabled={isLoading || isSaving || autoMode !== null}>
            {isSaving ? "Saving…" : "Save Summary"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

// ─── Memory Section ────────────────────────────────────────────────────────────

function MemorySection({ characterId, conversationId }: { characterId: string; conversationId: string | null }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [summaries, setSummaries] = useState<MemorySummary[]>([]);
  const [tokenCount, setTokenCount] = useState(0);
  const [tokenBudget, setTokenBudget] = useState(2000);
  const [isSummaryEditorOpen, setIsSummaryEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!conversationId) return;
    try {
      const [charData, memData] = await Promise.all([
        api.getCharacter(characterId),
        api.getMemories(conversationId),
      ]);
      setCharacter(charData);
      setContext(memData.context);
      setFacts(memData.facts);
      setSummaries(memData.summaries);
      setTokenCount((memData as any).tokenCount ?? 0);
      setTokenBudget((memData as any).tokenBudget ?? 2000);
    } catch { /* non-critical */ } finally {
      setIsLoading(false);
    }
  }, [characterId, conversationId]);

  useEffect(() => {
    fetchData();
    window.addEventListener(MEMORY_UPDATED_EVENT, fetchData);
    return () => window.removeEventListener(MEMORY_UPDATED_EVENT, fetchData);
  }, [fetchData]);

  const handleEditSave = async (id: string, predicate: string, target: string) => {
    await api.updateMemory(id, { predicate, target });
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (edgeId: string) => {
    await api.deleteMemory(edgeId);
    setFacts((prev) => prev.filter((f) => f.id !== edgeId));
    window.dispatchEvent(new Event(MEMORY_UPDATED_EVENT));
  };

   if (!conversationId) {
     return (
       <div className={styles.kgContainer}>
         <div className={styles.sectionHeader}>
           <DatabaseIcon size={14} /> KNOWLEDGE GRAPH
         </div>
         <div className={styles.memoryPlaceholder}>
           <div style={{ opacity: 0.5, marginBottom: '8px' }}><MessagesSquareIcon size={24} /></div>
           <span>Memories are isolated per-conversation. Start a chat to view the graph.</span>
         </div>
       </div>
     );
   }

  if (isLoading) {
    return (
      <div className={styles.memorySection}>
        <CollapsibleSection title="Memories" defaultOpen>
          <span className={styles.memoryEmpty}>Loading…</span>
        </CollapsibleSection>
      </div>
    );
  }

return (
    <div className={styles.memorySection}>
      <CollapsibleSection title="Context Window" defaultOpen>
        {conversationId && <ContextStatsPanel conversationId={conversationId} />}
        {character && <MemoryModeToggle character={character} characterId={characterId} />}
        {context && (
          <textarea
            className={styles.contextTextarea}
            value={context}
            readOnly rows={4}
            title="Memory injected into each system prompt"
          />
        )}
        <div className={styles.tokenBudgetRow}>
          <span className={styles.contextHint}>
            Memory: <strong>{tokenCount}</strong> / {tokenBudget} tokens injected
          </span>
          <div className={styles.tokenBar}>
            <div
              className={styles.tokenBarFill}
              style={{
                width: `${Math.min(100, (tokenCount / tokenBudget) * 100)}%`,
                backgroundColor: tokenCount / tokenBudget > 0.85 ? "var(--error)" : "var(--accent-secondary, #a78bfa)",
              }}
            />
          </div>
        </div>
        <button
          className={styles.summarizeBtn}
          onClick={() => setIsSummaryEditorOpen(true)}
          disabled={!conversationId}
          title="Open summary editor"
        >
          Summary Editor
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Knowledge Graph" defaultOpen>
        {facts.length === 0 ? (
          <span className={styles.memoryEmpty}>No facts stored yet</span>
        ) : (
          <div className={styles.factList}>
            {facts.map((fact) =>
              editingId === fact.id ? (
                <FactEditRow key={fact.id} fact={fact} onSave={handleEditSave} onCancel={() => setEditingId(null)} />
              ) : (
                <FactRow key={fact.id} fact={fact} onEdit={(id) => setEditingId(id)} onDelete={handleDelete} />
              )
            )}
          </div>
        )}

        <div className={styles.kgActions}>
          {showAddForm ? (
            <AddFactForm conversationId={conversationId} onAdded={() => { setShowAddForm(false); fetchData(); }} onCancel={() => setShowAddForm(false)} />
          ) : (
            <button className={styles.addFactBtn} onClick={() => setShowAddForm(true)}>+ Add fact</button>
          )}
        </div>
      </CollapsibleSection>

      {summaries.length > 0 && (
        <CollapsibleSection title="Compressed Memories">
          <div className={styles.factList}>
            {summaries.map((s) => (
              <div key={s.id} className={styles.factRow}>
                <span className={styles.factText}>{s.content.slice(0, 100)}{s.content.length > 100 ? "…" : ""}</span>
                <span className={`${styles.memoryEmpty} ${styles.summaryMeta}`}>{s.entityCount} facts · {new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <SummaryEditorModal
        isOpen={isSummaryEditorOpen}
        conversationId={conversationId}
        onClose={() => setIsSummaryEditorOpen(false)}
        onSaved={fetchData}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ModelRail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const characterId = params?.characterId as string | undefined;
  const conversationId = searchParams?.get("conv") ?? null;
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
        <span className={styles.headerTitle}>Config & Memory</span>
        <button className={styles.resetBtn} onClick={reset} title="Reset to defaults">Reset Local</button>
      </header>

      <div className={styles.scroller}>
        <CollapsibleSection title="Global API Connection" defaultOpen={false}>
          <GlobalApiSettings />
        </CollapsibleSection>

        <MemorySection characterId={characterId} conversationId={conversationId} />

        <CollapsibleSection title="System Prompt Override">
          <textarea
            className={styles.textarea}
            placeholder="Prepend custom instructions for this session…"
            rows={4}
            value={config.systemPromptOverride}
            onChange={(e) => set("systemPromptOverride", e.target.value)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Local Sampling Rules">
          <SliderRow label="Temperature" value={config.temperature} min={0} max={2} step={0.05} onChange={(v) => set("temperature", v)} />
          <SliderRow label="Top-P" value={config.topP} min={0} max={1} step={0.05} onChange={(v) => set("topP", v)} />
          <SliderRow label="Max Tokens" value={config.maxTokens} min={128} max={4096} step={64} onChange={(v) => set("maxTokens", v)} />
          <SliderRow label="Rep. Penalty" value={config.repPenalty} min={1.0} max={1.5} step={0.01} onChange={(v) => set("repPenalty", v)} />
        </CollapsibleSection>

        <CollapsibleSection title="Negative Prompt">
          <textarea
            className={styles.textarea}
            placeholder="Describe what the model should avoid…"
            rows={3}
            value={config.negativePrompt}
            onChange={(e) => set("negativePrompt", e.target.value)}
          />
        </CollapsibleSection>
      </div>
    </aside>
  );
}
