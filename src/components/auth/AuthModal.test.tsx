import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
  isSupabaseConfigured: () => true,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fr', setLocale: vi.fn() }),
}));

import { AuthProvider } from '@/lib/auth-context';
import AuthModal from './AuthModal';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthModal', () => {
  it('renders sign-in form when open', () => {
    render(
      <Wrapper>
        <AuthModal open={true} onOpenChange={() => {}} />
      </Wrapper>,
    );
    expect(screen.getByLabelText('auth.email')).toBeDefined();
    expect(screen.getByLabelText('auth.password')).toBeDefined();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <Wrapper>
        <AuthModal open={false} onOpenChange={() => {}} />
      </Wrapper>,
    );
    expect(container.querySelector('form')).toBeNull();
  });
});