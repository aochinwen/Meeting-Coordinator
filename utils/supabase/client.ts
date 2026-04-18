import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Singleton pattern to reuse client instance across renders
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        // Schema cache to reduce round-trips
        schema: 'public',
      },
      global: {
        // Custom fetch with caching for GET requests
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          return fetch(input, {
            ...init,
            // Add cache headers for GET requests
            ...(init?.method === 'GET' || !init?.method ? {
              next: { revalidate: 60 }
            } : {})
          });
        },
      },
    }
  );

  return clientInstance;
}
