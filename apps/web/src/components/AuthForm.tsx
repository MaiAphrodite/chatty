"use client";

import { useState, type FormEvent } from "react";
import styles from "./AuthForm.module.css";

type AuthFormProps = {
  mode: "login" | "register";
  onSubmit: (username: string, password: string) => Promise<void>;
  error: string | null;
};

export function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;
  const isRegister = mode === "register";
  const title = isRegister ? "Create Account" : "Welcome Back";
  const subtitle = isRegister
    ? "Start chatting with AI characters"
    : "Sign in to continue";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (isRegister && password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {displayError && (
        <div className={styles.error}>{displayError}</div>
      )}

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="username" className={styles.label}>
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            placeholder="Enter username"
            required
            minLength={3}
            maxLength={32}
            autoComplete="username"
            autoCapitalize="off"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="Enter password"
            required
            minLength={6}
            maxLength={128}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {isRegister && (
          <div className={styles.field}>
            <label htmlFor="confirm-password" className={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="Confirm password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        className={styles.button}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className={styles.spinner} />
        ) : isRegister ? (
          "Create Account"
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
