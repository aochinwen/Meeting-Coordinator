import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/Sidebar';
import { mockSupabaseClient } from '../mocks/supabase';

describe('Sidebar', () => {
  it('shows Demo as a main navigation item', async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'mock-user', email: 'user@example.com' } },
      error: null,
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /demo/i })).toBeInTheDocument();
    });
  });
});
