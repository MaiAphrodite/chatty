"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import styles from "./UserSettingsModal.module.css";
import { XIcon } from "./ui/Icons";

type UserSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ConnectionStatus = "idle" | "testing" | "success" | "error";

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { user, refreshUser } = useAuth();

  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setLlmEndpoint(user.llmEndpoint || "");
      setLlmApiKey(user.llmApiKey || "");
      setLlmModel(user.llmModel || "");
      setConnectionStatus("idle");
      setAvailableModels([]);
      setConnectionError(null);
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  async function handleTestConnection() {
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
        if (result.models.length > 0 && !llmModel) {
          setLlmModel(result.models[0]);
        }
      } else {
        setConnectionStatus("error");
        setConnectionError(result.error || "Connection failed");
      }
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(err instanceof Error ? err.message : "Connection test failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.updateUserSettings({
        llmEndpoint: llmEndpoint.trim() || undefined,
        llmApiKey: llmApiKey.trim() || undefined,
        llmModel: llmModel.trim() || undefined,
      });

      await refreshUser();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusIndicator = connectionStatus === "testing" ? (
    <div className={styles.statusRow}>
      <span className={styles.statusDot} data-status="testing" />
      <span className={styles.statusText}>Testing connection…</span>
    </div>
  ) : connectionStatus === "success" ? (
    <div className={styles.statusRow}>
      <span className={styles.statusDot} data-status="success" />
      <span className={styles.statusText}>
        Connected — {availableModels.length} model{availableModels.length !== 1 ? "s" : ""} found
      </span>
    </div>
  ) : connectionStatus === "error" ? (
    <div className={styles.statusRow}>
      <span className={styles.statusDot} data-status="error" />
      <span className={styles.statusTextError}>{connectionError}</span>
    </div>
  ) : null;

  const modalContent = (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className={styles.header}>
          <h2 id="settings-modal-title" className={styles.title}>
            API Configuration
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="llmEndpoint" className={styles.label}>
              API Base URL
              <span className={styles.labelBadge}>OpenAI-compatible</span>
            </label>
            <input
              id="llmEndpoint"
              type="text"
              className={styles.input}
              placeholder="https://api.x.ai/v1"
              value={llmEndpoint}
              onChange={(e) => {
                setLlmEndpoint(e.target.value);
                setConnectionStatus("idle");
              }}
            />
            <span className={styles.hint}>
              Any OpenAI-compatible endpoint. Examples: <code>https://api.x.ai/v1</code> (xAI),
              {" "}<code>https://api.openai.com/v1</code>,
              {" "}<code>http://localhost:1234/v1</code> (LM Studio),
              {" "}<code>http://localhost:11434/v1</code> (Ollama)
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="llmApiKey" className={styles.label}>
              API Key
            </label>
            <input
              id="llmApiKey"
              type="password"
              className={styles.input}
              placeholder="xai-... / sk-..."
              value={llmApiKey}
              onChange={(e) => {
                setLlmApiKey(e.target.value);
                setConnectionStatus("idle");
              }}
            />
            <span className={styles.hint}>
              Encrypted at rest with AES-256-GCM. Leave empty for endpoints that don't require auth.
            </span>
          </div>

          <button
            type="button"
            className={styles.testBtn}
            onClick={handleTestConnection}
            disabled={!llmEndpoint.trim() || connectionStatus === "testing"}
          >
            {connectionStatus === "testing" ? "Testing…" : "🔌 Test Connection"}
          </button>

          {statusIndicator}

          <div className={styles.field}>
            <label htmlFor="llmModel" className={styles.label}>
              Model
            </label>
            {availableModels.length > 0 ? (
              <select
                id="llmModel"
                className={styles.select}
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
              >
                {!llmModel && <option value="">Select a model…</option>}
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                id="llmModel"
                type="text"
                className={styles.input}
                placeholder="grok-3-mini (test connection to discover models)"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
              />
            )}
            <span className={styles.hint}>
              Test the connection above to auto-populate available models, or type manually.
            </span>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
