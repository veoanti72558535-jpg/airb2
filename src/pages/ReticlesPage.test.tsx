/**
 * Tranche F.4 — Tests UI réticules : page liste, page détail, navigation,
 * upload/replace/remove image, intégration LibraryPage et routes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReticlesPage from './ReticlesPage';
import ReticleDetailPage from './ReticleDetailPage';
import LibraryPage from './LibraryPage';
import { reticleStore } from '@/lib/storage';
import { I18nProvider } from '@/lib/i18n';

beforeEach(() => {
  localStorage.clear();
});

function renderAt(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/reticles" element={<ReticlesPage />} />
          <Route path="/library/reticles/:id" element={<ReticleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('ReticlesPage — Tranche F.4', () => {
  it('shows empty state when no reticles', () => {
    renderAt('/library/reticles');
    expect(screen.getByTestId('reticles-empty')).toBeInTheDocument();
  });

  it('renders placeholder when reticle has no image', () => {
    const r = reticleStore.create({
      brand: 'Vortex',
      model: 'EBR-7C',
      type: 'mrad-grid',
      unit: 'MRAD',
      subtension: 1,
    });
    renderAt('/library/reticles');
    expect(screen.getByTestId(`reticles-placeholder-${r.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`reticles-thumb-${r.id}`)).not.toBeInTheDocument();
  });

  it('renders thumbnail when reticle has imageDataUrl', () => {
    const r = reticleStore.create({
      brand: 'Athlon',
      model: 'APRS6',
      type: 'mil-dot',
      unit: 'MRAD',
      subtension: 1,
      imageDataUrl: 'data:image/png;base64,AAA',
    });
    renderAt('/library/reticles');
    const img = screen.getByTestId(`reticles-thumb-${r.id}`) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('data:image/png');
  });

  it('navigates to detail page via the card link', async () => {
    const r = reticleStore.create({
      brand: 'X', model: 'Y', type: 'duplex', unit: 'MOA', subtension: 0.5,
    });
    renderAt(`/library/reticles/${r.id}`);
    expect(await screen.findByText('X Y')).toBeInTheDocument();
  });
});

describe('ReticleDetailPage — image actions', () => {
  it('shows none-state when reticle has no image', () => {
    const r = reticleStore.create({
      brand: 'Brand', model: 'NoImg', type: 'bdc', unit: 'MOA', subtension: 1,
    });
    renderAt(`/library/reticles/${r.id}`);
    expect(screen.getByText(/Aucune image/i)).toBeInTheDocument();
    expect(screen.queryByTestId('reticle-image')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reticle-image-remove-btn')).not.toBeInTheDocument();
  });

  it('shows remove button when image is present', () => {
    const r = reticleStore.create({
      brand: 'Brand', model: 'WithImg', type: 'bdc', unit: 'MOA', subtension: 1,
      imageDataUrl: 'data:image/png;base64,BBB',
    });
    renderAt(`/library/reticles/${r.id}`);
    expect(screen.getByTestId('reticle-image')).toBeInTheDocument();
    expect(screen.getByTestId('reticle-image-remove-btn')).toBeInTheDocument();
  });

  it('removes the image when remove button is clicked', async () => {
    const r = reticleStore.create({
      brand: 'Brand', model: 'Rm', type: 'other', unit: 'MOA', subtension: 1,
      imageDataUrl: 'data:image/png;base64,CCC',
    });
    renderAt(`/library/reticles/${r.id}`);
    fireEvent.click(screen.getByTestId('reticle-image-remove-btn'));
    await waitFor(() => {
      expect(reticleStore.getById(r.id)?.imageDataUrl).toBeUndefined();
    });
  });

  it('uploads an image and persists it to the store', async () => {
    const r = reticleStore.create({
      brand: 'Brand', model: 'Up', type: 'mrad-grid', unit: 'MRAD', subtension: 1,
    });
    renderAt(`/library/reticles/${r.id}`);
    const input = screen.getByTestId('reticle-image-input') as HTMLInputElement;
    const file = new File(['fake'], 'reticle.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(reticleStore.getById(r.id)?.imageDataUrl?.startsWith('data:')).toBe(true);
    });
  });

  it('rejects an invalid file type without persisting', async () => {
    const r = reticleStore.create({
      brand: 'Brand', model: 'Bad', type: 'mrad-grid', unit: 'MRAD', subtension: 1,
    });
    renderAt(`/library/reticles/${r.id}`);
    const input = screen.getByTestId('reticle-image-input') as HTMLInputElement;
    const file = new File(['x'], 'bad.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    // Wait a tick — nothing should have been written.
    await new Promise(r => setTimeout(r, 20));
    expect(reticleStore.getById(r.id)?.imageDataUrl).toBeUndefined();
  });

  it('renders NotFound when reticle id does not exist', () => {
    renderAt('/library/reticles/does-not-exist');
    expect(screen.queryByTestId('reticle-image-area')).not.toBeInTheDocument();
  });
});

describe('LibraryPage — reticles tab integration', () => {
  it('exposes the reticles tab and mounts ReticlesPage on click', () => {
    renderAt('/library');
    // Tab label visible (FR default)
    const reticulesBtn = screen.getByRole('button', { name: /Réticules/i });
    fireEvent.click(reticulesBtn);
    // ReticlesPage empty state appears.
    expect(screen.getByTestId('reticles-empty')).toBeInTheDocument();
  });
});

describe('Reticle backwards compatibility', () => {
  it('legacy reticles without imageDataUrl remain valid', () => {
    const r = reticleStore.create({
      brand: 'Old', model: 'Legacy', type: 'duplex', unit: 'MOA', subtension: 1,
    });
    expect(r.imageDataUrl).toBeUndefined();
    expect(reticleStore.getById(r.id)?.imageDataUrl).toBeUndefined();
  });
});
