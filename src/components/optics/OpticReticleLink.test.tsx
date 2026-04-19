/**
 * Tranche G — Tests du composant OpticReticleLink + persistance reticleId
 * sur l'entité Optic. Couvre les 3 états (none / linked / missing), les
 * actions (link, change, unlink), la navigation, le placeholder image, et
 * la rétrocompatibilité.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { OpticReticleLink } from './OpticReticleLink';
import { opticStore, reticleStore } from '@/lib/storage';
import { I18nProvider } from '@/lib/i18n';
import OpticDetailPage from '@/pages/OpticDetailPage';
import ReticleDetailPage from '@/pages/ReticleDetailPage';

beforeEach(() => {
  localStorage.clear();
});

function Harness({ initial }: { initial?: string }) {
  const [id, setId] = useState<string | undefined>(initial);
  return (
    <I18nProvider>
      <MemoryRouter>
        <OpticReticleLink reticleId={id} onChange={setId} />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe('OpticReticleLink — Tranche G', () => {
  it('shows the "no linked reticle" state by default', () => {
    render(<Harness />);
    expect(screen.getByTestId('optic-reticle-none')).toBeInTheDocument();
    expect(screen.getByTestId('optic-reticle-link-btn')).toBeInTheDocument();
  });

  it('renders the linked reticle (brand, model, type, subtension)', () => {
    const r = reticleStore.create({
      brand: 'Vortex', model: 'EBR-7C', type: 'mrad-grid', unit: 'MRAD', subtension: 1,
    });
    render(<Harness initial={r.id} />);
    expect(screen.getByTestId('optic-reticle-linked')).toBeInTheDocument();
    expect(screen.getByText('Vortex EBR-7C')).toBeInTheDocument();
    expect(screen.getByText(/mrad-grid/)).toBeInTheDocument();
    expect(screen.getByText(/1 MRAD/)).toBeInTheDocument();
  });

  it('shows placeholder when linked reticle has no image', () => {
    const r = reticleStore.create({
      brand: 'Athlon', model: 'APRS', type: 'mil-dot', unit: 'MRAD', subtension: 1,
    });
    render(<Harness initial={r.id} />);
    expect(screen.getByTestId('optic-reticle-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('optic-reticle-thumb')).not.toBeInTheDocument();
  });

  it('shows thumbnail when linked reticle has imageDataUrl', () => {
    const r = reticleStore.create({
      brand: 'X', model: 'Y', type: 'duplex', unit: 'MOA', subtension: 0.5,
      imageDataUrl: 'data:image/png;base64,AAA',
    });
    render(<Harness initial={r.id} />);
    const img = screen.getByTestId('optic-reticle-thumb') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('data:image/png');
  });

  it('shows the "missing" state when reticleId points to nothing', () => {
    render(<Harness initial="ghost-id" />);
    expect(screen.getByTestId('optic-reticle-missing')).toBeInTheDocument();
    expect(screen.getByTestId('optic-reticle-unlink-btn')).toBeInTheDocument();
  });

  it('unlinks the reticle when unlink button is clicked', () => {
    const r = reticleStore.create({
      brand: 'B', model: 'M', type: 'bdc', unit: 'MOA', subtension: 1,
    });
    render(<Harness initial={r.id} />);
    fireEvent.click(screen.getByTestId('optic-reticle-unlink-btn'));
    expect(screen.getByTestId('optic-reticle-none')).toBeInTheDocument();
  });

  it('opens the picker and selects a reticle, switching to linked state', async () => {
    const r = reticleStore.create({
      brand: 'Pick', model: 'Me', type: 'other', unit: 'MOA', subtension: 1,
    });
    render(<Harness />);
    fireEvent.click(screen.getByTestId('optic-reticle-link-btn'));
    const option = await screen.findByTestId(`optic-reticle-option-${r.id}`);
    fireEvent.click(option);
    await waitFor(() => {
      expect(screen.getByTestId('optic-reticle-linked')).toBeInTheDocument();
    });
    expect(screen.getByText('Pick Me')).toBeInTheDocument();
  });

  it('exposes an "open" link that points to the reticle detail route', () => {
    const r = reticleStore.create({
      brand: 'Open', model: 'Me', type: 'duplex', unit: 'MOA', subtension: 1,
    });
    render(<Harness initial={r.id} />);
    const link = screen.getByTestId('optic-reticle-open-btn') as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe(`/library/reticles/${r.id}`);
  });

  it('hides actions when editable is false', () => {
    const r = reticleStore.create({
      brand: 'RO', model: 'Mode', type: 'duplex', unit: 'MOA', subtension: 1,
    });
    render(
      <I18nProvider>
        <MemoryRouter>
          <OpticReticleLink reticleId={r.id} onChange={() => {}} editable={false} />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(screen.queryByTestId('optic-reticle-unlink-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('optic-reticle-change-btn')).not.toBeInTheDocument();
  });
});

describe('Optic.reticleId — persistance & rétrocompatibilité', () => {
  it('legacy optics without reticleId remain valid', () => {
    const o = opticStore.create({
      name: 'Old Scope', clickUnit: 'MOA', clickValue: 0.25,
    } as any);
    expect(o.reticleId).toBeUndefined();
    expect(opticStore.getById(o.id)?.reticleId).toBeUndefined();
  });

  it('persists reticleId when set', () => {
    const r = reticleStore.create({
      brand: 'B', model: 'M', type: 'mrad-grid', unit: 'MRAD', subtension: 1,
    });
    const o = opticStore.create({
      name: 'Scope', clickUnit: 'MRAD', clickValue: 0.1, reticleId: r.id,
    } as any);
    expect(opticStore.getById(o.id)?.reticleId).toBe(r.id);
  });

  it('clears reticleId via update(undefined)', () => {
    const r = reticleStore.create({
      brand: 'B', model: 'M', type: 'duplex', unit: 'MOA', subtension: 1,
    });
    const o = opticStore.create({
      name: 'S', clickUnit: 'MOA', clickValue: 0.25, reticleId: r.id,
    } as any);
    opticStore.update(o.id, { reticleId: undefined });
    expect(opticStore.getById(o.id)?.reticleId).toBeUndefined();
  });
});

describe('OpticDetailPage — Tranche G integration', () => {
  function renderDetail(opticId: string) {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={[`/library/optic/${opticId}`]}>
          <Routes>
            <Route path="/library/optic/:id" element={<OpticDetailPage />} />
            <Route path="/library/reticles/:id" element={<ReticleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  it('shows "no linked reticle" by default on the detail page', () => {
    const o = opticStore.create({
      name: 'Test Scope', clickUnit: 'MOA', clickValue: 0.25,
    } as any);
    renderDetail(o.id);
    expect(screen.getByTestId('optic-reticle-none')).toBeInTheDocument();
  });

  it('persists a reticle link when the user picks one in the detail page', async () => {
    const r = reticleStore.create({
      brand: 'B', model: 'M', type: 'duplex', unit: 'MOA', subtension: 1,
    });
    const o = opticStore.create({
      name: 'Test', clickUnit: 'MOA', clickValue: 0.25,
    } as any);
    renderDetail(o.id);
    fireEvent.click(screen.getByTestId('optic-reticle-link-btn'));
    const option = await screen.findByTestId(`optic-reticle-option-${r.id}`);
    fireEvent.click(option);
    await waitFor(() => {
      expect(opticStore.getById(o.id)?.reticleId).toBe(r.id);
    });
  });
});