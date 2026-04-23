import { describe, it, expect, test } from 'vitest';
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

  // ── Coordinate helpers ──
  // x = cx + milX * ms,  y = cy - milY * ms
  const coord = (size: number, milX: number, milY: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const ms = size / 20;
    return { x: cx + milX * ms, y: cy - milY * ms };
  };

  const sizes = [200, 400, 800] as const;

  // ── BDC position tests ──
  describe.each(sizes)('bdc at size=%i', (size) => {
    it('has 4 triangles and crosshair lines at correct positions', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'bdc' })} size={size} />);
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(4);

      // Bottom triangle tip at (0, -12.5 MIL)
      const { x: tipX, y: tipY } = coord(size, 0, -12.5);
      const bottomTri = polygons[0].getAttribute('points')!;
      expect(bottomTri).toContain(`${tipX},${tipY}`);

      // Crosshair: first line is (0,10)→(0,1.25)
      const lines = container.querySelectorAll('line');
      const first = lines[0];
      const { x: x0, y: y10 } = coord(size, 0, 10);
      const { y: y125 } = coord(size, 0, 1.25);
      expect(Number(first.getAttribute('x1'))).toBeCloseTo(x0, 5);
      expect(Number(first.getAttribute('y1'))).toBeCloseTo(y10, 5);
      expect(Number(first.getAttribute('y2'))).toBeCloseTo(y125, 5);
    });

    it('has BDC drop labels', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'bdc' })} size={size} />);
      const texts = [...container.querySelectorAll('text')].map(t => t.textContent);
      // Labels at i4=2→20 step 2 → values 1..10
      expect(texts).toContain('1');
      expect(texts).toContain('5');
      expect(texts).toContain('10');
    });
  });

  // ── Mildot position tests ──
  describe.each(sizes)('mildot at size=%i', (size) => {
    it('has 20 MIL dots at correct positions', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'mildot' })} size={size} />);
      const ms = size / 20;
      const cx = size / 2;
      const cy = size / 2;
      // Filter circles that are MIL dots (not the ocular border)
      const dots = [...container.querySelectorAll('circle')].filter(c => c.getAttribute('fill') !== 'none');
      // 5 per axis × 4 = 20 + 1 ocular (stroke, no fill → filtered)
      expect(dots.length).toBe(20);
      // Check dot at +3 MIL right on horizontal axis
      const dot3 = dots.find(c => {
        const cxA = Number(c.getAttribute('cx'));
        return Math.abs(cxA - (cx + 3 * ms)) < 0.01;
      });
      expect(dot3).toBeTruthy();
      expect(Number(dot3!.getAttribute('cy'))).toBeCloseTo(cy, 5);
      expect(Number(dot3!.getAttribute('r'))).toBeCloseTo(0.15 * ms, 5);
    });
  });

  // ── Duplex position tests ──
  describe.each(sizes)('duplex at size=%i', (size) => {
    it('has thick outer and thin inner arms', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'duplex' })} size={size} />);
      const lines = [...container.querySelectorAll('line')];
      const thick = lines.filter(l => l.getAttribute('stroke-width') === '3');
      const thin = lines.filter(l => l.getAttribute('stroke-width') === '0.5');
      expect(thick.length).toBe(4); // 4 outer arms
      expect(thin.length).toBe(4);  // 4 inner arms

      // Outer top arm: (0,10)→(0,3)
      const { y: y10 } = coord(size, 0, 10);
      const { y: y3 } = coord(size, 0, 3);
      expect(Number(thick[0].getAttribute('y1'))).toBeCloseTo(y10, 5);
      expect(Number(thick[0].getAttribute('y2'))).toBeCloseTo(y3, 5);
    });
  });

  // ── German post tests ──
  describe.each(sizes)('german at size=%i', (size) => {
    it('has 3 thin arms + 1 thick bottom post', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'german' })} size={size} />);
      const lines = [...container.querySelectorAll('line')];
      const thick = lines.filter(l => l.getAttribute('stroke-width') === '3');
      expect(thick.length).toBe(1);
      // Thick post goes from (0,-0.2) to (0,-10)
      const { y: yTop } = coord(size, 0, -0.2);
      const { y: yBot } = coord(size, 0, -10);
      expect(Number(thick[0].getAttribute('y1'))).toBeCloseTo(yTop, 5);
      expect(Number(thick[0].getAttribute('y2'))).toBeCloseTo(yBot, 5);
    });
  });

  // ── MOA hash marks ──
  describe.each(sizes)('moa at size=%i', (size) => {
    it('has crosshair + MOA hash marks with labels at 5,10,15…', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'moa' })} size={size} />);
      // Crosshair = 2 lines + many hash ticks
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(10);
      // Labels at multiples of 5 MOA
      const texts = [...container.querySelectorAll('text')].map(t => t.textContent);
      expect(texts).toContain('5');
      expect(texts).toContain('10');
    });

    it('places first MOA tick at 0.2909 MIL equivalent', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'moa' })} size={size} />);
      const ms = size / 20;
      const cy = size / 2;
      const moaMil = 0.2909;
      // First hTick is at +moaMil on vertical axis → y = cy - moaMil*ms
      const lines = [...container.querySelectorAll('line')];
      // Skip first 2 (crosshair), 3rd is first hTick
      const firstTick = lines[2];
      expect(Number(firstTick.getAttribute('y1'))).toBeCloseTo(cy - moaMil * ms, 1);
    });
  });

  // ── MRAD hash marks ──
  describe.each(sizes)('mrad at size=%i', (size) => {
    it('has labels at 2,4,6,8 MIL', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'mrad' })} size={size} />);
      const texts = [...container.querySelectorAll('text')].map(t => t.textContent);
      expect(texts).toContain('2');
      expect(texts).toContain('4');
      expect(texts).toContain('6');
      expect(texts).toContain('8');
      expect(texts).not.toContain('1');
      expect(texts).not.toContain('3');
    });

    it('places full tick at 1 MIL', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'mrad' })} size={size} />);
      const ms = size / 20;
      const cy = size / 2;
      // 3rd line (after 2 crosshair) = hTick at 1 MIL
      const lines = [...container.querySelectorAll('line')];
      expect(Number(lines[2].getAttribute('y1'))).toBeCloseTo(cy - 1 * ms, 1);
    });
  });

  // ── Chevron ──
  describe.each(sizes)('chevron at size=%i', (size) => {
    it('has crosshair + chevron polygon at +0.5 MIL below center', () => {
      const { container } = render(<ReticleViewer reticle={makeEntry({ pattern_type: 'chevron' })} size={size} />);
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(1);
      const ms = size / 20;
      const cx = size / 2;
      const cy = size / 2;
      // Tip at (cx, cy + 0.5*ms) — below center (positive SVG y)
      const pts = polygons[0].getAttribute('points')!;
      expect(pts).toContain(`${cx},${cy + 0.5 * ms}`);
    });
  });

  // ── Illumination badge ──
  it('shows ILLUM badge when illuminated', () => {
    const { container } = render(<ReticleViewer reticle={makeEntry({ illuminated: true, pattern_type: 'bdc' })} size={400} />);
    const illumText = [...container.querySelectorAll('text')].find(t => t.textContent === 'ILLUM');
    expect(illumText).toBeTruthy();
    expect(illumText!.getAttribute('fill')).toBe('red');
    // BDC illuminated also has red center circle
    const redCircle = [...container.querySelectorAll('circle')].find(c => c.getAttribute('fill') === 'red');
    expect(redCircle).toBeTruthy();
  });

  // ── Size scaling invariant ──
  it('all patterns scale linearly with size', () => {
    const patterns = ['bdc', 'mildot', 'duplex', 'german', 'moa', 'mrad', 'chevron'] as const;
    for (const p of patterns) {
      const { container: c200 } = render(<ReticleViewer reticle={makeEntry({ pattern_type: p })} size={200} />);
      const { container: c400 } = render(<ReticleViewer reticle={makeEntry({ pattern_type: p })} size={400} />);
      const lines200 = [...c200.querySelectorAll('line')];
      const lines400 = [...c400.querySelectorAll('line')];
      expect(lines200.length).toBe(lines400.length);
      // First line x1 should scale by factor 2
      if (lines200.length > 0) {
        const x1_200 = Number(lines200[0].getAttribute('x1'));
        const x1_400 = Number(lines400[0].getAttribute('x1'));
        // x = size/2 + milX * size/20 → if milX=0, x=size/2, check absolute scaling
        if (x1_200 !== 0) {
          expect(x1_400 / x1_200).toBeCloseTo(2, 2);
        } else {
          expect(x1_400).toBe(0);
        }
      }
    }
  });
});