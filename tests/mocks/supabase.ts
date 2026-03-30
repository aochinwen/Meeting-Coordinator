import { vi } from 'vitest';

export const mockSupabaseClient = {
  from: vi.fn((table) => {
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      match: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      // Used to resolve the chain
      then: function(resolve: any) {
        resolve({ data: [], error: null });
      }
    };
  }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
};

vi.mock('@supabase/ssr', () => {
  return {
    createBrowserClient: vi.fn(() => mockSupabaseClient),
    createServerClient: vi.fn(() => mockSupabaseClient),
  };
});
