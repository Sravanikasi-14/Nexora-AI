"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getBusinessId, setBusinessId } from "@/lib/api";
import { Business } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Ensures the user is authenticated and resolves their business.
 * Uses TanStack Query to cache the user session and business metadata
 * to eliminate duplicate requests when shifting pages/tabs.
 */
export function useSession(opts: { requireBusiness?: boolean } = {}) {
  const router = useRouter();
  
  const token = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;

  // React Query cached session lookup
  const { data, isLoading, error } = useQuery({
    queryKey: ["businessMe"],
    queryFn: () => api.get<{ business: Business | null; user?: { passwordSetupRequired: boolean } }>("/api/business/me"),
    enabled: !!token,
    staleTime: 1000 * 60 * 15, // Cache session for 15 minutes
    gcTime: 1000 * 60 * 30,    // Retain in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // 1. Redirect if token is missing
    if (!token) {
      router.replace("/login");
      return;
    }

    // 2. Redirect if server auth failed
    if (error) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexora_token");
        localStorage.removeItem("nexora_business_id");
        localStorage.removeItem("nexora_user");
      }
      router.replace("/login");
      return;
    }

    // 3. Handle routing rules once session is loaded
    if (data) {
      if (data.user?.passwordSetupRequired) {
        router.replace("/setup-password");
        return;
      }
      if (!data.business && opts.requireBusiness) {
        router.replace("/discovery");
        return;
      }
      if (data.business && opts.requireBusiness && !data.business.discoveryComplete) {
        router.replace("/discovery");
        return;
      }
      
      // Update global API state
      if (data.business) {
        setBusinessId(data.business.id);
      } else {
        setBusinessId(null);
      }
    }
  }, [data, isLoading, error, token, router, opts.requireBusiness]);

  const business = data?.business || null;
  const businessId = business?.id || (typeof window !== "undefined" ? getBusinessId() : null);

  return {
    business,
    businessId,
    loading: !token || isLoading,
  };
}
