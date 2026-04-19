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
import { projectileStore, reticleStore, opticStore } from '@/lib/storage';

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
