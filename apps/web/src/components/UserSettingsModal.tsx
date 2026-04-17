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

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setLlmEndpoint(user.llmEndpoint || "");
      setLlmApiKey(user.llmApiKey || "");
      setLlmModel(user.llmModel || "");
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

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
            User Settings
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
              Custom LLM Endpoint
            </label>
            <input
              id="llmEndpoint"
              type="text"
              className={styles.input}
              placeholder="e.g. http://localhost:1234/v1"
              value={llmEndpoint}
              onChange={(e) => setLlmEndpoint(e.target.value)}
            />
            <span className={styles.hint}>
              Leave empty to use the system default endpoint. For OpenAI-compatible proxies (LM Studio, Ollama, etc), include `/v1`.
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="llmApiKey" className={styles.label}>
              LLM API Key
            </label>
            <input
              id="llmApiKey"
              type="password"
              className={styles.input}
              placeholder="sk-..."
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
            />
            <span className={styles.hint}>
              Stored using AES-256-GCM symmetric encryption.
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="llmModel" className={styles.label}>
              Custom Model Override
            </label>
            <input
              id="llmModel"
              type="text"
              className={styles.input}
              placeholder="e.g. gpt-4"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
            />
            <span className={styles.hint}>
               Leave empty to use the system default model.
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
