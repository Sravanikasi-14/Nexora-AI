"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // Cache entries are fresh for 5 minutes
            gcTime: 1000 * 60 * 10,  // Keep unused cache data for 10 minutes (replaces cacheTime in v5)
            refetchOnWindowFocus: false, // Turn off automatic refetches on window focus
            refetchOnReconnect: true,
            retry: 1, // Only retry failed requests once to preserve API resources
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
