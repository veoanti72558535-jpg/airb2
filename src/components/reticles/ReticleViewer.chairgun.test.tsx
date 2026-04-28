import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ReticleViewer, { clearSvgCache } from './ReticleViewer';
import type { ReticleCatalogEntry } from '@/lib/reticles-catalog-repo';
import type { ChairgunElement, ChairgunReticle } from '@/lib/chairgun-reticles-repo';

function strelokEntry(): ReticleCatalogEntry {
  return {
    id: 1, reticle_id: 100, name: 'Test', brand: 'BrandX',
    focal_plane: 'FFP', min_magnification: 5, true_magnification: 25,
    max_magnification: 25, click_vertical: 0.1, click_horizontal: 0.1,
    click_units: 'MRAD', illuminated: false, pattern_type: 'mildot',
  };
}

function chairgunReticle(elements: ChairgunElement[]): ChairgunReticle {
  return {
    reticle_id: 7, name: 'CG Test', focal_plane: 'FFP',
    unit: 'MRAD', true_magnification: null,
    elements, element_count: elements.length,
  };
}

describe('ReticleViewer — Mode A (ChairGun geometry)', () => {
  beforeEach(() => clearSvgCache());

  it('falls back to generic mode when elements is undefined', () => {
    const { container } = render(<ReticleViewer reticle={strelokEntry()} size={400} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-render-mode')).toBe('generic');
    expect(svg.getAttribute('data-pattern')).toBe('mildot');
  });

  it('falls back to generic mode when elements is empty []', () => {
    const { container } = render(
      <ReticleViewer reticle={strelokEntry()} elements={[]} size={400} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-render-mode')).toBe('generic');
  });

  it('renders dot radius=0 as a small filled circle on the vertical axis', () => {
    // A dot with x=0 (vertical axis) at position=2 with radius=0
    const { container } = render(
      <ReticleViewer
        reticle={chairgunReticle([{ type: 'dot', x: 0, y: 2, radius: 0 }])}
        elements={[{ type: 'dot', x: 0, y: 2, radius: 0 }]}
        size={400}
      />,
    );
    // x=0 means vertical axis only → 1 filled circle
    const circles = [...container.querySelectorAll('circle')].filter(
      c => c.getAttribute('fill') !== 'none',
    );
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders dot radius>0 as filled dots on both axes', () => {
    const size = 400;
    const els: ChairgunElement[] = [{ type: 'dot', x: 1, y: 3, radius: 1 }];
    const { container } = render(
      <ReticleViewer
        reticle={chairgunReticle(els)}
        elements={els}
        size={size}
      />,
    );
    // Should produce circles (dots) on both axes
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2); // vertical + horizontal
  });

  it('renders line element as symmetric arms on the specified axis', () => {
    const size = 400;
    const center = size / 2;
    const ppu = size / (2 * 10); // pixels per unit = 20
    // Line: gap=1, axis=horizontal, extent=5, thickness=0
    const els: ChairgunElement[] = [
      { type: 'line', x1: 1, y1: 1, x2: 5, y2: 0 },
    ];
    const { container } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={size} />,
    );
    // Should render 2 lines (positive and negative arms)
    const lines = [...container.querySelectorAll('line')];
    expect(lines.length).toBe(2);
    // Positive arm: from gap=1 to extent=5 on horizontal axis
    const posArm = lines[0];
    expect(Number(posArm.getAttribute('x1'))).toBeCloseTo(center + 1 * ppu, 1);
    expect(Number(posArm.getAttribute('x2'))).toBeCloseTo(center + 5 * ppu, 1);
    expect(Number(posArm.getAttribute('y1'))).toBeCloseTo(center, 1);
    // Negative arm: mirrored
    const negArm = lines[1];
    expect(Number(negArm.getAttribute('x1'))).toBeCloseTo(center - 1 * ppu, 1);
    expect(Number(negArm.getAttribute('x2'))).toBeCloseTo(center - 5 * ppu, 1);
  });

  it('shows "ChairGun" badge with element count when elements provided', () => {
    const els: ChairgunElement[] = [
      { type: 'dot', x: 1, y: 0, radius: 0 },
      { type: 'dot', x: 0, y: 1, radius: 0 },
    ];
    const { container, getByTestId } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={400} />,
    );
    const badge = getByTestId('cg-badge');
    expect(badge.textContent).toContain('ChairGun');
    expect(badge.textContent).toContain('2');
    expect(container.querySelector('svg')!.getAttribute('data-render-mode')).toBe('chairgun');
  });

  it('does not add auto crosshair — data defines the crosshair', () => {
    const els: ChairgunElement[] = [
      { type: 'dot', x: 1, y: 0, radius: 0 },
      { type: 'line', x1: 0, y1: 0, x2: 1, y2: 0 },
    ];
    const { container } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={400} />,
    );
    // No auto-crosshair in the new implementation
    expect(container.querySelector('[data-testid="cg-auto-crosshair-h"]')).toBeNull();
    expect(container.querySelector('[data-testid="cg-auto-crosshair-v"]')).toBeNull();
  });

  it('Mode B (generic patterns) is unchanged when elements absent', () => {
    // Smoke check: mildot still renders 20+ dots like before
    const { container } = render(<ReticleViewer reticle={strelokEntry()} size={400} />);
    const dots = [...container.querySelectorAll('circle')].filter(
      (c) => c.getAttribute('fill') !== 'none',
    );
    expect(dots.length).toBeGreaterThanOrEqual(20);
  });
});