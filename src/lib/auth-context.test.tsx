import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
  isSupabaseConfigured: () => true,
}));

import { AuthProvider, useAuth } from './auth-context';
import { supabase } from '@/integrations/supabase/client';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const mockAuth = supabase!.auth as any;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('returns user: null and loading: false when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // Wait for getSession to resolve
    await act(async () => {});
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signIn('a@b.com', 'pass123');
    });
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass123' });
  });

  it('signOut calls supabase.auth.signOut', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('signIn throws on error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login') });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => {
        await result.current.signIn('bad@b.com', 'wrong');
      }),
    ).rejects.toThrow('Invalid login');
  });
});