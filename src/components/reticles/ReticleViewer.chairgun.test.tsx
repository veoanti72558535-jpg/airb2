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

  it('renders dot radius=0 as a small fixed-radius (r=2) circle', () => {
    const { container } = render(
      <ReticleViewer
        reticle={chairgunReticle([{ type: 'dot', x: 0, y: 0, radius: 0 }])}
        elements={[{ type: 'dot', x: 0, y: 0, radius: 0 }]}
        size={400}
      />,
    );
    const ticks = container.querySelectorAll('[data-cg-tick="1"]');
    expect(ticks.length).toBe(1);
    expect(ticks[0].getAttribute('r')).toBe('2');
    // Filled (not hollow)
    expect(ticks[0].getAttribute('fill')).not.toBe('none');
  });

  it('renders dot radius>0 as a hollow circle with radius × pixelsPerUnit', () => {
    const size = 400;
    const viewportRange = 10;
    const pixelsPerUnit = size / (2 * viewportRange); // = 20
    const radius = 0.5; // angular units
    const els: ChairgunElement[] = [{ type: 'dot', x: 0, y: 0, radius }];
    const { container } = render(
      <ReticleViewer
        reticle={chairgunReticle(els)}
        elements={els}
        size={size}
      />,
    );
    const circles = container.querySelectorAll('[data-cg-circle="1"]');
    expect(circles.length).toBe(1);
    expect(Number(circles[0].getAttribute('r'))).toBeCloseTo(radius * pixelsPerUnit, 5);
    expect(circles[0].getAttribute('fill')).toBe('none');
  });

  it('renders line element with correct pixel coordinates', () => {
    const size = 400;
    const center = size / 2;
    const pixelsPerUnit = size / (2 * 10);
    const els: ChairgunElement[] = [
      { type: 'line', x1: -2, y1: 0, x2: 2, y2: 0 },
    ];
    const { container } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={size} />,
    );
    // First non-auto-crosshair line should be our line (auto-crosshair adds 2 lines first)
    const lines = [...container.querySelectorAll('line')];
    // Auto-crosshair active because no line > 5 units → 2 cross lines + 1 our line.
    expect(lines.length).toBe(3);
    const ours = lines[2];
    expect(Number(ours.getAttribute('x1'))).toBeCloseTo(center + (-2) * pixelsPerUnit, 5);
    expect(Number(ours.getAttribute('x2'))).toBeCloseTo(center + 2 * pixelsPerUnit, 5);
    expect(Number(ours.getAttribute('y1'))).toBeCloseTo(center, 5);
  });

  it('shows "ChairGun" badge with element count when elements provided', () => {
    const els: ChairgunElement[] = [
      { type: 'dot', x: 1, y: 0, radius: 0 },
      { type: 'dot', x: -1, y: 0, radius: 0 },
    ];
    const { container, getByTestId } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={400} />,
    );
    const badge = getByTestId('cg-badge');
    expect(badge.textContent).toContain('ChairGun');
    expect(badge.textContent).toContain('2');
    expect(container.querySelector('svg')!.getAttribute('data-render-mode')).toBe('chairgun');
  });

  it('adds an auto crosshair when no element is a long line', () => {
    const els: ChairgunElement[] = [
      { type: 'dot', x: 1, y: 0, radius: 0 },
      { type: 'line', x1: 0, y1: 0, x2: 1, y2: 0 }, // short line (length 1)
    ];
    const { container } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={400} />,
    );
    expect(container.querySelector('svg')!.getAttribute('data-cg-auto-crosshair')).toBe('1');
    expect(container.querySelector('[data-testid="cg-auto-crosshair-h"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="cg-auto-crosshair-v"]')).toBeTruthy();
  });

  it('does NOT add auto crosshair when a long line (>5 units) exists', () => {
    const els: ChairgunElement[] = [
      { type: 'line', x1: -8, y1: 0, x2: 8, y2: 0 }, // length 16
    ];
    const { container } = render(
      <ReticleViewer reticle={chairgunReticle(els)} elements={els} size={400} />,
    );
    expect(container.querySelector('svg')!.getAttribute('data-cg-auto-crosshair')).toBeNull();
    expect(container.querySelector('[data-testid="cg-auto-crosshair-h"]')).toBeNull();
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