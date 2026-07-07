"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getBusinessId, setBusinessId } from "@/lib/api";
import { Business } from "@/lib/types";

/**
 * Ensures the user is authenticated and resolves their business.
 * requireDiscovery=true additionally redirects to /discovery if no business
 * exists yet, matching the mandated flow: Auth -> Discovery -> Assessment -> Dashboard.
 */
export function useSession(opts: { requireBusiness?: boolean } = {}) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const res = await api.get<{ business: Business | null }>("/api/business/me");
        if (!res.business && opts.requireBusiness) {
          router.replace("/discovery");
          return;
        }
        if (res.business && opts.requireBusiness && !res.business.discoveryComplete) {
          router.replace("/discovery");
          return;
        }
        if (res.business) {
          setBusinessId(res.business.id);
          setBusiness(res.business);
        } else {
          setBusinessId(null);
        }
      } catch {
        router.replace("/login");
        return;
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { business, businessId: business?.id || getBusinessId(), loading };
}
