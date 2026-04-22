import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Invalid login')) {
        setError(t('auth.error.invalidCredentials' as any));
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError(t('auth.error.emailTaken' as any));
      } else {
        setError(t('auth.error.generic' as any));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === 'signIn' ? t('auth.signIn' as any) : t('auth.signUp' as any)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'signIn' ? t('auth.signIn' as any) : t('auth.signUp' as any)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">{t('auth.email' as any)}</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">{t('auth.password' as any)}</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t('auth.loading' as any)
              : mode === 'signIn'
                ? t('auth.signIn' as any)
                : t('auth.signUp' as any)}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(''); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center pt-1"
        >
          {mode === 'signIn' ? t('auth.signUp' as any) : t('auth.signIn' as any)}
        </button>
      </DialogContent>
    </Dialog>
  );
}