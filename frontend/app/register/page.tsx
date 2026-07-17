"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?tab=register");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
      <Spinner size="lg" />
      <p className="text-xs">Loading registration…</p>
    </div>
  );
}
