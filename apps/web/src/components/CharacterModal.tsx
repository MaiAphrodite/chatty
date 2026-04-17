"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/api";
import type { Character, CharacterPayload } from "../lib/types";
import { XIcon } from "./ui/Icons";
import styles from "./CharacterModal.module.css";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: Character;
  onSuccess: () => void;
  onClose: () => void;
};

function useCharacterForm(initial?: Character) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [firstMessage, setFirstMessage] = useState(initial?.firstMessage ?? "");
  const [exampleDialogue, setExampleDialogue] = useState(initial?.exampleDialogue ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [memoryMode, setMemoryMode] = useState<"manual" | "auto">(initial?.memoryMode ?? "manual");

  const toPayload = (): CharacterPayload => ({
    name: name.trim(),
    description: description.trim() || undefined,
    avatarUrl: avatarUrl.trim() || null,
    systemPrompt: systemPrompt.trim(),
    firstMessage: firstMessage.trim(),
    exampleDialogue: exampleDialogue.trim() || undefined,
    isPublic,
    memoryMode,
  });

  const isValid = name.trim().length > 0 && systemPrompt.trim().length > 0 && firstMessage.trim().length > 0;

  return {
    name, setName,
    description, setDescription,
    avatarUrl, setAvatarUrl,
    systemPrompt, setSystemPrompt,
    firstMessage, setFirstMessage,
    exampleDialogue, setExampleDialogue,
    isPublic, setIsPublic,
    memoryMode, setMemoryMode,
    toPayload, isValid,
  };
}

function DeleteConfirm({ characterId, onDeleted, onCancel }: {
  characterId: string;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteCharacter(characterId);
      onDeleted();
    } catch {
      setError("Failed to delete. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.confirmBox}>
      <p className={styles.confirmText}>
        This will permanently delete the character and all of its conversation history. This cannot be undone.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.confirmActions}>
        <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Yes, delete"}
        </button>
        <button className={styles.confirmCancelBtn} onClick={onCancel} disabled={isDeleting}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CharacterModal({ mode, initial, onSuccess, onClose }: Props) {
  const form = useCharacterForm(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.isValid) {
      setError("Name, character prompt, and first message are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "create") {
        await api.createCharacter(form.toPayload());
      } else {
        await api.updateCharacter(initial!.id, form.toPayload());
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className={styles.backdrop} ref={backdropRef} onClick={handleBackdropClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {mode === "create" ? "Create Character" : "Edit Character"}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Name <span className={styles.required}>*</span></label>
            <input className={styles.input} value={form.name} onChange={(e) => form.setName(e.target.value)}
              placeholder="Character name" maxLength={100} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Image URL</label>
            <input type="url" className={styles.input} value={form.avatarUrl}
              onChange={(e) => form.setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg" />
            <span className={styles.hint}>Leave empty to use initials</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="Brief description of the character" maxLength={500} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Character Prompt <span className={styles.required}>*</span></label>
            <textarea className={styles.textarea} value={form.systemPrompt}
              onChange={(e) => form.setSystemPrompt(e.target.value)}
              placeholder="Personality, behavior, backstory..." maxLength={2000} required />
            <span className={styles.hint}>Shapes the character's personality and behavior</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>First Message <span className={styles.required}>*</span></label>
            <textarea className={styles.textarea} value={form.firstMessage}
              onChange={(e) => form.setFirstMessage(e.target.value)}
              placeholder="The opening message the character will send..." maxLength={500} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Example Dialogue</label>
            <textarea className={styles.textarea} value={form.exampleDialogue}
              onChange={(e) => form.setExampleDialogue(e.target.value)}
              placeholder="Example conversation to guide the character..." maxLength={2000} />
            <span className={styles.hint}>Optional — helps shape response style</span>
          </div>

          <div className={styles.field}>
            <label className={styles.toggle}>
              <input type="checkbox" className={styles.toggleInput} checked={form.isPublic}
                onChange={(e) => form.setIsPublic(e.target.checked)} />
              <span className={styles.toggleLabel}>Make character public</span>
            </label>
            <span className={styles.hint}>Public characters are visible to all users</span>
          </div>

          <div className={styles.field}>
            <label className={styles.toggle}>
              <input type="checkbox" className={styles.toggleInput}
                checked={form.memoryMode === "auto"}
                onChange={(e) => form.setMemoryMode(e.target.checked ? "auto" : "manual")} />
              <span className={styles.toggleLabel}>Auto Memory</span>
            </label>
            <span className={styles.hint}>
              When enabled, the character automatically remembers personal details you share. Uses additional LLM calls.
            </span>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : (mode === "create" ? "Create Character" : "Save Changes")}
            </button>
          </div>

          {mode === "edit" && initial && (
            <div className={styles.danger}>
              <p className={styles.dangerLabel}>Danger Zone</p>
              {showDeleteConfirm ? (
                <DeleteConfirm
                  characterId={initial.id}
                  onDeleted={onSuccess}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              ) : (
                <button type="button" className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                  Delete Character
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
