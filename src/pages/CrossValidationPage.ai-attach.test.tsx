/**
 * IA-1 — test d'intégration sur `CrossValidationPage` :
 *   - simule l'attache d'un brouillon IA (validé hors-modale) à un cas
 *     existant via `AttachAiDialog`,
 *   - vérifie que `userCaseRepo` persiste bien la nouvelle référence
 *     Strelok Pro avec `confidence === 'C'` et
 *     `extractionMethod === 'screenshot-ai'`.
 *
 * Le but n'est PAS de re-tester le flux interne d'`AIImportModal` (déjà
 * couvert par `AIImportModal.test.tsx`). On stub la modale par un bouton
 * de test qui appelle directement `onConfirm()` avec un payload
 * réaliste, puis on pilote l'`AttachAiDialog` réel.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import {
  USER_CASES_STORAGE_KEY,
  userCaseRepo,
} from '@/lib/cross-validation/user-case-repo';
import {
  makeEmptyUserCase,
  type UserReference,
} from '@/lib/cross-validation/user-case-schema';
import type { AIImportConfirmPayload } from '@/components/cross-validation/AIImportModal';

// --- 1. Supabase doit être "configuré" pour exposer le bouton IA -----------
vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
  },
  getSupabaseUrl: () => 'http://local-test',
}));

// --- 2. Toasts : on neutralise pour éviter le bruit ------------------------
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// --- 2b. Stub UI Select (Radix) ---------------------------------------------
// Radix Select est notoirement difficile à piloter sous jsdom (pointer
// capture, scrollIntoView, portails). On le remplace par un <select>
// natif, strictement local à ce test : on garde le contrat
// (`onValueChange`, `value`, item.value) et on évite toute dépendance à
// l'implémentation Radix. Aucun autre composant utilisant `Select` n'est
// rendu dans ce fichier.
vi.mock('@/components/ui/select', () => {
  const React = require('react');
  const SelectCtx = (React.createContext as any)({
    value: '',
    onChange: (_v: string) => {},
  });

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <SelectCtx.Provider value={{ value, onChange: onValueChange }}>
        {children}
      </SelectCtx.Provider>
    );
  }
  function SelectTrigger({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement>) {
    return <div {...rest}>{children}</div>;
  }
  function SelectValue({ placeholder }: { placeholder?: string }) {
    return <span data-stub-placeholder>{placeholder}</span>;
  }
  function SelectContent({ children }: { children: React.ReactNode }) {
    const { value, onChange } = React.useContext(SelectCtx);
    return (
      <select
        data-testid="ai-attach-native-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          —
        </option>
        {children}
      </select>
    );
  }
  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    return <option value={value}>{children}</option>;
  }
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

// --- 3. Stub d'AIImportModal -----------------------------------------------
// On expose un bouton qui injecte directement un payload `screenshot-ai`
// via `onConfirm`. On ne re-teste pas la pipeline IA ici : on valide que
// la page sait persister le résultat APRÈS l'étape d'attache.
const REFERENCE_FIXTURE: UserReference = {
  meta: {
    source: 'strelok-pro',
    version: 'Strelok Pro 6.7.7',
    confidence: 'C',
    extractionMethod: 'screenshot-ai',
    extractedAt: '2026-04-20T00:00:00.000Z',
    notes: 'fixture',
  },
  rows: [
    { range: 25, drop: -3.2, velocity: 248 },
    { range: 50, drop: -12.1, velocity: 240 },
  ],
};

vi.mock('@/components/cross-validation/AIImportModal', () => {
  return {
    AIImportModal: ({
      open,
      onConfirm,
    }: {
      open: boolean;
      onOpenChange: (n: boolean) => void;
      onConfirm: (p: AIImportConfirmPayload) => void;
    }) => {
      if (!open) return null;
      return (
        <div data-testid="ai-modal-stub">
          <button
            type="button"
            data-testid="ai-modal-stub-confirm"
            onClick={() =>
              onConfirm({
                reference: REFERENCE_FIXTURE,
                meta: {
                  runId: 'run-test-1',
                  providerUsed: 'quatarly',
                  modelUsed: 'claude-sonnet-4',
                  fallbackUsed: false,
                  promptVersion: 1,
                },
                draft: {
                  rows: REFERENCE_FIXTURE.rows,
                  fieldConfidence: {},
                  unreadable: [],
                  assumptions: [],
                },
              })
            }
          >
            stub-confirm
          </button>
        </div>
      );
    },
  };
});

// --- Imports APRÈS les mocks (Vitest hoist gère, mais on garde la lisibilité)
import CrossValidationPage from './CrossValidationPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <CrossValidationPage />
      </I18nProvider>
    </MemoryRouter>,
  );
}

function seedExistingCase() {
  const base = makeEmptyUserCase();
  base.caseId = 'seed-case-22';
  base.title = 'Seed case 22 cal';
  // Inputs minimaux valides pour le store (le test n'exécute pas le moteur).
  base.inputs = {
    projectileName: 'JSB Hades 18gr',
    caliber: '.22',
    weightGrains: 18,
    bc: 0.035,
    muzzleVelocity: 280,
    sightHeight: 50,
    zeroDistance: 30,
    rangeMax: 100,
    rangeStep: 10,
    bcModel: 'G1',
    twistRate: 16,
  };
  // Référence existante "manual-entry" pour s'assurer qu'on AJOUTE,
  // pas qu'on remplace.
  base.references = [
    {
      meta: {
        source: 'chairgun-elite',
        version: 'CGE 1.6',
        confidence: 'B',
        extractionMethod: 'manual-entry',
        extractedAt: '2026-04-19T00:00:00.000Z',
      },
      rows: [{ range: 25, drop: -3.0 }],
    },
  ];
  const created = userCaseRepo.create(base);
  if (!created.ok || !created.stored) {
    throw new Error(
      `Seed failed: ${JSON.stringify(created.issues ?? 'unknown')}`,
    );
  }
  return created.stored;
}

describe('CrossValidationPage — IA-1 attach to existing case', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("attache un brouillon IA à un cas existant et persiste la référence avec confidence='C' / extractionMethod='screenshot-ai'", async () => {
    const seeded = seedExistingCase();
    expect(seeded.case.references).toHaveLength(1);

    renderPage();

    // 1. Le bouton IA doit être visible (Supabase mocké comme configuré)
    const aiBtn = await screen.findByTestId('cv-ai-import-btn');
    fireEvent.click(aiBtn);

    // 2. La modale stub s'ouvre — on déclenche onConfirm avec le payload IA.
    fireEvent.click(await screen.findByTestId('ai-modal-stub-confirm'));

    // 3. AttachAiDialog s'ouvre. À ce stade : ZÉRO persistance encore.
    await screen.findByTestId('ai-attach-dialog');
    const stillStored = userCaseRepo.getById(seeded.id);
    expect(stillStored?.case.references).toHaveLength(1);

    // 4. Sélection du cas existant via le Select stubbé en <select> natif.
    const nativeSelect = screen.getByTestId(
      'ai-attach-native-select',
    ) as HTMLSelectElement;
    fireEvent.change(nativeSelect, { target: { value: seeded.id } });

    // 5. Le bouton confirmer doit s'activer — on clique.
    const confirmExisting = screen.getByTestId(
      'ai-attach-confirm-existing',
    ) as HTMLButtonElement;
    await waitFor(() => expect(confirmExisting.disabled).toBe(false));
    fireEvent.click(confirmExisting);

    // 6. Vérification de la persistance dans userCaseRepo.
    await waitFor(() => {
      const updated = userCaseRepo.getById(seeded.id);
      expect(updated).toBeDefined();
      expect(updated!.case.references).toHaveLength(2);
    });

    const updated = userCaseRepo.getById(seeded.id)!;
    const aiRef = updated.case.references[1];
    // Garde-fous IA-1 plafonnés
    expect(aiRef.meta.source).toBe('strelok-pro');
    expect(aiRef.meta.confidence).toBe('C');
    expect(aiRef.meta.extractionMethod).toBe('screenshot-ai');
    expect(aiRef.meta.version).toBe('Strelok Pro 6.7.7');
    expect(aiRef.rows).toHaveLength(2);
    expect(aiRef.rows[1]).toMatchObject({ range: 50, drop: -12.1, velocity: 240 });

    // La 1re référence existante est intacte (on AJOUTE, on ne remplace pas).
    expect(updated.case.references[0].meta.source).toBe('chairgun-elite');
    expect(updated.case.references[0].meta.extractionMethod).toBe('manual-entry');

    // 7. Vérification raw localStorage : la réf IA est bien sérialisée
    //    avec les bonnes valeurs critiques (défense en profondeur).
    const raw = localStorage.getItem(USER_CASES_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(raw!).toContain('"extractionMethod":"screenshot-ai"');
    expect(raw!).toContain('"confidence":"C"');
    expect(raw!).toContain('"source":"strelok-pro"');
  });

  it("annuler l'attache (bouton 'Plus tard') ne persiste rien", async () => {
    const seeded = seedExistingCase();

    renderPage();
    fireEvent.click(await screen.findByTestId('cv-ai-import-btn'));
    fireEvent.click(await screen.findByTestId('ai-modal-stub-confirm'));
    await screen.findByTestId('ai-attach-dialog');

    // Annulation explicite
    fireEvent.click(screen.getByTestId('ai-attach-cancel'));

    // Le dialog disparaît et le cas seedé reste avec sa seule référence.
    await waitFor(() =>
      expect(screen.queryByTestId('ai-attach-dialog')).not.toBeInTheDocument(),
    );
    const after = userCaseRepo.getById(seeded.id)!;
    expect(after.case.references).toHaveLength(1);
    expect(after.case.references[0].meta.extractionMethod).toBe('manual-entry');
  });
});