/**
 * Tranche F.3 — Tests `ImportJsonModal`.
 *
 * Invariants couverts :
 *  - aucun write avant preview
 *  - preview obligatoire avant import (bouton désactivé)
 *  - import final n'écrit QUE `ok` + `sanitized`
 *  - duplicates et rejected ne sont jamais écrits
 *  - bouton import désactivé si rien d'importable
 *  - réutilise la pipeline F.2 (la sanitisation MERO -> G1 transite vers le store)
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ImportJsonModal } from './ImportJsonModal';
import { projectileStore, reticleStore, opticStore, flushProjectilePersistence } from '@/lib/storage';
import * as repo from '@/lib/projectile-repo';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  localStorage.clear();
});

function fakeFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'data.json', { type: 'application/json' });
}

async function uploadFile(testId: string, content: unknown) {
  const input = screen.getByTestId(testId) as HTMLInputElement;
  // jsdom : on stub `files` puis on déclenche change.
  Object.defineProperty(input, 'files', {
    value: [fakeFile(content)],
    configurable: true,
  });
  fireEvent.change(input);
  // attendre la lecture du File (handleFile est async)
  await waitFor(() => {
    expect(screen.getByTestId('import-preview-btn')).not.toBeDisabled();
  });
}

function renderModal(entityType: 'projectile' | 'optic' | 'reticle' = 'projectile') {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <I18nProvider>
      <ImportJsonModal
        entityType={entityType}
        source="json-user"
        open
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </I18nProvider>,
  );
  return { onClose, onSuccess };
}

describe('ImportJsonModal — workflow & invariants', () => {
  it('does not write anything when only the file is uploaded', async () => {
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    expect(projectileStore.getAll()).toEqual([]);
    expect(screen.queryByTestId('import-preview')).toBeNull();
  });

  it('disables import button until preview is rendered', async () => {
    renderModal('projectile');
    expect((screen.getByTestId('import-confirm-btn') as HTMLButtonElement).disabled).toBe(true);
    await uploadFile('import-file-input', [
      { brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    // Toujours désactivé tant qu'on n'a pas cliqué Aperçu.
    expect((screen.getByTestId('import-confirm-btn') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    expect((screen.getByTestId('import-confirm-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('writes ONLY ok + sanitized items on confirm (skips rejects + duplicates)', async () => {
    renderModal('projectile');
    await uploadFile('import-file-input', [
      // ok
      { brand: 'A', model: '1', weight: 18, bc: 0.025, caliber: '.22' },
      // sanitized (SLG1 → G1)
      { brand: 'B', model: '2', weight: 30, bc: 0.05, bcModel: 'SLG1', caliber: '.30' },
      // duplicate intra-batch
      { brand: 'A', model: '1', weight: 18, bc: 0.025, caliber: '.22' },
      // rejected (champ inconnu .strict)
      { brand: 'C', model: '3', weight: 20, bc: 0.03, caliber: '.25', evil: true },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));

    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => expect(projectileStore.getAll()).toHaveLength(2));

    const stored = projectileStore.getAll();
    const brands = stored.map(p => p.brand).sort();
    expect(brands).toEqual(['A', 'B']);
    // Sanitisation MERO → G1 effectivement persistée
    const b = stored.find(p => p.brand === 'B');
    expect(b?.bcModel).toBe('G1');
    // Marqueur importedFrom appliqué
    for (const p of stored) {
      expect(p.importedFrom).toBe('json-user');
    }
  });

  it('disables import button when nothing is writable (only rejects)', async () => {
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22', evil: 1 },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    expect((screen.getByTestId('import-confirm-btn') as HTMLButtonElement).disabled).toBe(true);
    expect(projectileStore.getAll()).toEqual([]);
  });

  it('writes a reticle with mil → MRAD canonicalisation (sanitized path)', async () => {
    renderModal('reticle');
    await uploadFile('import-file-input', [
      { brand: 'B', model: 'M', type: 'mil-dot', unit: 'mil', subtension: 1 },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => expect(reticleStore.getAll()).toHaveLength(1));
    expect(reticleStore.getAll()[0].unit).toBe('MRAD');
    expect(reticleStore.getAll()[0].importedFrom).toBe('json-user');
  });

  it('writes optics on confirm', async () => {
    renderModal('optic');
    await uploadFile('import-file-input', [
      { name: 'Vortex Strike Eagle', clickUnit: 'MRAD', clickValue: 0.1 },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => expect(opticStore.getAll()).toHaveLength(1));
    expect(opticStore.getAll()[0].name).toBe('Vortex Strike Eagle');
  });

  it('cancel does not write and resets', async () => {
    const { onClose } = renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-cancel-btn'));
    expect(projectileStore.getAll()).toEqual([]);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ImportJsonModal — Tranche Import UX (IDB persist confirmation)', () => {
  it('awaits IDB persistence before reporting success on projectile import', async () => {
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'A', model: '1', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    // After the click resolves, both the cache AND IDB must contain the item.
    await waitFor(() => expect(projectileStore.getAll()).toHaveLength(1));
    await flushProjectilePersistence();
    const persisted = await repo.readProjectilesFromIdb();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].brand).toBe('A');
  });

  it('keeps the preview and shows an error banner when IDB persistence fails', async () => {
    const spy = vi.spyOn(repo, 'writeProjectilesToIdb').mockRejectedValueOnce(
      new Error('IDB exploded'),
    );
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'Z', model: '9', weight: 22, bc: 0.03, caliber: '.25' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => screen.getByTestId('import-persist-error'));
    // Preview is preserved → user can retry without re-uploading.
    expect(screen.getByTestId('import-preview')).toBeTruthy();
    // Confirm button is re-enabled (phase back to 'error', not committing).
    expect((screen.getByTestId('import-confirm-btn') as HTMLButtonElement).disabled).toBe(false);
    spy.mockRestore();
  });

  it('disables confirm + cancel during commit to block double-submit', async () => {
    let resolveWrite: (() => void) | null = null;
    const spy = vi.spyOn(repo, 'writeProjectilesToIdb').mockImplementationOnce(
      () => new Promise((res) => { resolveWrite = () => res(); }),
    );
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'D', model: 'd', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    // While persisting, both buttons must be disabled.
    await waitFor(() => {
      expect((screen.getByTestId('import-confirm-btn') as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByTestId('import-cancel-btn') as HTMLButtonElement).disabled).toBe(true);
    });
    resolveWrite?.();
    spy.mockRestore();
  });
});

describe('ImportJsonModal — Tranche Import UX (explicit retry persist)', () => {
  it('shows an explicit retry button only on persist failure', async () => {
    const spy = vi.spyOn(repo, 'writeProjectilesToIdb').mockRejectedValueOnce(
      new Error('IDB exploded'),
    );
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'R', model: '1', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => screen.getByTestId('import-persist-error'));
    // Retry button is visible inside the persist error banner.
    expect(screen.getByTestId('import-retry-persist-btn')).toBeTruthy();
    spy.mockRestore();
  });

  it('retry-only re-runs persistence (no duplicate items in cache or IDB)', async () => {
    const spy = vi.spyOn(repo, 'writeProjectilesToIdb')
      .mockRejectedValueOnce(new Error('IDB exploded'))
      // 2nd call (retry) must succeed and is delegated to the real impl
      .mockImplementationOnce(async (items) => {
        // Mirror real behaviour : just remember the snapshot.
        (globalThis as { __lastIdbSnapshot?: unknown }).__lastIdbSnapshot = items;
      });
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'A', model: '1', weight: 18, bc: 0.025, caliber: '.22' },
      { brand: 'B', model: '2', weight: 20, bc: 0.03, caliber: '.25' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => screen.getByTestId('import-persist-error'));

    // Cache already holds the 2 items from the initial createMany().
    expect(projectileStore.getAll()).toHaveLength(2);

    fireEvent.click(screen.getByTestId('import-retry-persist-btn'));
    // Wait for modal to close on success.
    await waitFor(() => expect(screen.queryByTestId('import-persist-error')).toBeNull());

    // Cache MUST still contain exactly 2 items — no duplicate insert.
    expect(projectileStore.getAll()).toHaveLength(2);
    // The 2nd writeProjectilesToIdb call received the same 2-item snapshot.
    const snap = (globalThis as { __lastIdbSnapshot?: Array<{ brand: string }> }).__lastIdbSnapshot;
    expect(snap).toHaveLength(2);
    spy.mockRestore();
  });

  it('preserves the preview during the persistence error', async () => {
    const spy = vi.spyOn(repo, 'writeProjectilesToIdb').mockRejectedValueOnce(
      new Error('IDB exploded'),
    );
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'P', model: 'p', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    fireEvent.click(screen.getByTestId('import-confirm-btn'));
    await waitFor(() => screen.getByTestId('import-persist-error'));
    // Preview is still rendered.
    expect(screen.getByTestId('import-preview')).toBeTruthy();
    spy.mockRestore();
  });

  it('does NOT show the retry button when there is no persist error', async () => {
    renderModal('projectile');
    await uploadFile('import-file-input', [
      { brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' },
    ]);
    fireEvent.click(screen.getByTestId('import-preview-btn'));
    await waitFor(() => screen.getByTestId('import-preview'));
    expect(screen.queryByTestId('import-retry-persist-btn')).toBeNull();
  });
});

// Reference flushProjectilePersistence to keep the import used.
void flushProjectilePersistence;
