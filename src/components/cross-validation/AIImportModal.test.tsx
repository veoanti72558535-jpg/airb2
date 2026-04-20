/**
 * IA-1 — tests UI de `AIImportModal`.
 *
 * Couverture demandée par le plan §11.4 :
 *   - état `consent` → `upload` → `analyzing` → `review` ;
 *   - `error` côté upload (image trop volumineuse) ;
 *   - abandon = AUCUN onConfirm (pas de persistance) ;
 *   - bouton confirm DÉSACTIVÉ tant que `strelokVersion` est vide ;
 *   - bouton confirm activé après saisie + plafond confiance C dans le payload.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import {
  AIImportModal,
  type AIImportConfirmPayload,
} from './AIImportModal';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  supabase: {},
  getSupabaseUrl: () => 'http://local',
}));

// Stub the network-bound extraction call. Tests drive the response
// shape directly to validate UI states without touching the wire.
const extractMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ai/strelok-rows', async () => {
  const actual = await vi.importActual<typeof import('./../../lib/ai/strelok-rows')>(
    '@/lib/ai/strelok-rows',
  );
  return { ...actual, extractStrelokRowsFromScreenshot: extractMock };
});

function Harness({ onConfirm }: { onConfirm: (p: AIImportConfirmPayload) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <I18nProvider>
      <AIImportModal open={open} onOpenChange={setOpen} onConfirm={onConfirm} />
    </I18nProvider>
  );
}

function makeImageFile(name = 't.png', size = 1024) {
  return new File([new Uint8Array(size)], name, { type: 'image/png' });
}

beforeEach(() => {
  extractMock.mockReset();
});

describe('AIImportModal — flux & garde-fous IA-1', () => {
  it('démarre sur le consentement et n\'écrit rien si on abandonne', () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    // Étape 1 — consentement
    expect(screen.getByText(/Étape 1|Step 1/)).toBeInTheDocument();
    // Abandonner
    fireEvent.click(screen.getAllByRole('button', { name: /Annuler|Cancel/i })[0]);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('passe à l\'upload après acceptation du consentement', () => {
    render(<Harness onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /accepte|accept/i }));
    expect(screen.getByTestId('ai-import-file-input')).toBeInTheDocument();
  });

  it('appelle onConfirm seulement après revue + version Strelok renseignée', async () => {
    const onConfirm = vi.fn();
    extractMock.mockResolvedValue({
      draft: {
        rows: [{ range: 50, drop: -12.1, velocity: 240 }],
        fieldConfidence: { 'rows[0].range': 0.95 },
        unreadable: [],
        assumptions: [],
      },
      meta: {
        runId: 'r1',
        providerUsed: 'quatarly',
        modelUsed: 'claude-sonnet-4',
        fallbackUsed: false,
        promptVersion: 1,
      },
    });

    render(<Harness onConfirm={onConfirm} />);
    // Consent → upload
    fireEvent.click(screen.getByRole('button', { name: /accepte|accept/i }));
    // Upload file
    const input = screen.getByTestId('ai-import-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeImageFile()] } });
    // Lance l'analyse
    fireEvent.click(screen.getByRole('button', { name: /Lancer|Start analysis/i }));
    // Attend le panneau de review
    await waitFor(() => expect(screen.getByTestId('ai-import-table')).toBeInTheDocument());

    const confirmBtn = screen.getByTestId('ai-import-confirm') as HTMLButtonElement;
    // Bouton désactivé tant que la version Strelok est vide
    expect(confirmBtn.disabled).toBe(true);

    // Saisie de la version
    fireEvent.change(screen.getByTestId('ai-import-version-input'), {
      target: { value: 'Strelok Pro 6.7.7' },
    });
    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0] as AIImportConfirmPayload;
    // Plafond confiance forcé à 'C'
    expect(payload.reference.meta.confidence).toBe('C');
    expect(payload.reference.meta.extractionMethod).toBe('screenshot-ai');
    expect(payload.reference.meta.source).toBe('strelok-pro');
    // Aucune ligne perdue
    expect(payload.reference.rows).toHaveLength(1);
  });

  it('affiche une erreur "trop volumineuse" sans appeler l\'extraction', () => {
    render(<Harness onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /accepte|accept/i }));
    const input = screen.getByTestId('ai-import-file-input') as HTMLInputElement;
    // > 4 Mo
    fireEvent.change(input, { target: { files: [makeImageFile('huge.png', 5 * 1024 * 1024)] } });
    // Le message d'erreur utilise "trop volumineuse / too large" — on
    // cible le bandeau d'erreur, pas l'astuce "≤ 4 Mo" du formulaire.
    expect(
      screen.getByText(/trop volumineuse|too large/i),
    ).toBeInTheDocument();
    expect(extractMock).not.toHaveBeenCalled();
  });

  it('N\'écrit rien si l\'utilisateur ferme la modale au stade revue', async () => {
    const onConfirm = vi.fn();
    extractMock.mockResolvedValue({
      draft: {
        rows: [{ range: 50 }],
        fieldConfidence: {},
        unreadable: [],
        assumptions: [],
      },
      meta: {
        runId: null,
        providerUsed: 'quatarly',
        modelUsed: 'claude-sonnet-4',
        fallbackUsed: false,
        promptVersion: 1,
      },
    });
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /accepte|accept/i }));
    fireEvent.change(screen.getByTestId('ai-import-file-input'), {
      target: { files: [makeImageFile()] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lancer|Start analysis/i }));
    await waitFor(() => expect(screen.getByTestId('ai-import-table')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Abandonner|Abandon/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});