import React, { useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase-check';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        setError(t('auth.error.invalidCredentials' as any));
      } else if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError(t('auth.error.emailTaken' as any));
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError(t('auth.error.network' as any));
      } else {
        setError(t('auth.error.generic' as any));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-2">
          <Crosshair className="h-10 w-10 text-primary" />
          <h1 className="font-heading font-bold text-2xl tracking-tight">
            Air<span className="text-gradient">Ballistik</span>
          </h1>
        </div>

        {!configured ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {t('auth.error.notConfigured' as any)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email' as any)}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password' as any)}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.loading' as any)}
                </>
              ) : mode === 'signIn' ? (
                t('auth.signIn' as any)
              ) : (
                t('auth.signUp' as any)
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="underline hover:text-foreground transition-colors"
                onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(''); }}
              >
                {mode === 'signIn' ? t('auth.signUp' as any) : t('auth.signIn' as any)}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}