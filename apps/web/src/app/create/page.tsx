"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateCharacterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home?create=1");
  }, [router]);

  return null;
}