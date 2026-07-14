"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?tab=register");
  }, [router]);

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-muted">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Loading registration…</p>
    </div>
  );
}
