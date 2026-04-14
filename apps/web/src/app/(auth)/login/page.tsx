"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthForm } from "../../../components/AuthForm";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) router.replace("/chat");
  }, [user, isLoading, router]);

  async function handleLogin(username: string, password: string) {
    setError(null);
    try {
      await login(username, password);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  if (isLoading) return null;

  return (
    <>
      <AuthForm mode="login" onSubmit={handleLogin} error={error} />
      <p className={styles.link}>
        Don&apos;t have an account?{" "}
        <Link href="/register">Sign up</Link>
      </p>
    </>
  );
}
