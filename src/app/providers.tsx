'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from '@tanstack/react-query'

export default function Providers({ children, state }: { children: ReactNode; state: DehydratedState }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      // Keep page data warm while users move between routes; cached data is
      // still refreshed after five minutes or when explicitly invalidated.
      queries: { staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false, retry: 1 },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  )
}
