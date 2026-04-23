import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReticleViewer from './ReticleViewer';
import type { ReticleCatalogEntry } from '@/lib/reticles-catalog-repo';

function makeEntry(overrides: Partial<ReticleCatalogEntry> = {}): ReticleCatalogEntry {
  return {
    id: 1, reticle_id: 100, name: 'Test Reticle', brand: 'TestBrand',
    focal_plane: 'FFP', min_magnification: 5, true_magnification: 25,
    max_magnification: 25, click_vertical: 0.1, click_horizontal: 0.1,
    click_units: 'MRAD', illuminated: false, pattern_type: 'generic',
    ...overrides,
  };
}

describe('ReticleViewer', () => {
  it('renders bdc pattern with triangles', () => {
    const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'bdc' })} size={400} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('data-pattern')).toBe('bdc');
    // BDC has triangle polygons
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders mildot pattern with circles', () => {
    const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'mildot' })} size={400} />);
    expect(container.querySelector('svg')?.getAttribute('data-pattern')).toBe('mildot');
    // 5 per axis × 4 directions = 20 dots + ocular circle = 21+
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(20);
  });

  it('renders duplex pattern with 2 stroke widths', () => {
    const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'duplex' })} size={400} />);
    const lines = container.querySelectorAll('line');
    const widths = new Set([...lines].map(l => l.getAttribute('stroke-width')));
    expect(widths.size).toBeGreaterThanOrEqual(2);
  });

  it('FFP: scaleFactor is 1 regardless of magnification', () => {
    const { container: c1 } = render(<ReticleViewer reticle={makeEntry({ focal_plane: 'FFP' })} size={400} currentMagnification={5} />);
    const { container: c2 } = render(<ReticleViewer reticle={makeEntry({ focal_plane: 'FFP' })} size={400} currentMagnification={25} />);
    // Both should produce identical line positions
    const lines1 = [...c1.querySelectorAll('line')].map(l => l.getAttribute('x1'));
    const lines2 = [...c2.querySelectorAll('line')].map(l => l.getAttribute('x1'));
    expect(lines1).toEqual(lines2);
  });

  it('SFP: different magnification changes hash positions', () => {
    const entry = makeEntry({ focal_plane: 'SFP', true_magnification: 25, pattern_type: 'mrad' });
    const { container: c1 } = render(<ReticleViewer reticle={entry} size={400} currentMagnification={10} />);
    const { container: c2 } = render(<ReticleViewer reticle={entry} size={400} currentMagnification={25} />);
    const lines1 = [...c1.querySelectorAll('line')].map(l => l.getAttribute('x1'));
    const lines2 = [...c2.querySelectorAll('line')].map(l => l.getAttribute('x1'));
    // At different magnifications, hash marks should differ for SFP
    expect(lines1).not.toEqual(lines2);
  });
});