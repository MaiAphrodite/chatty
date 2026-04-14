"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthForm } from "../../../components/AuthForm";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) router.replace("/chat");
  }, [user, isLoading, router]);

  async function handleRegister(username: string, password: string) {
    setError(null);
    try {
      await register(username, password);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  if (isLoading) return null;

  return (
    <>
      <AuthForm mode="register" onSubmit={handleRegister} error={error} />
      <p className={styles.link}>
        Already have an account?{" "}
        <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
