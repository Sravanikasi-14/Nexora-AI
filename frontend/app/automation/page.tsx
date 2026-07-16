"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutomationPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/suggested-messages");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-muted text-sm font-medium">
      Redirecting to AI Suggested Messages...
    </div>
  );
}
