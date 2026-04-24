/**
 * POI overlay (ChairGun scope view) — tests de rendu.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ReticleViewer from './ReticleViewer';

const baseReticle = {
  pattern_type: 'mrad',
  focal_plane: 'FFP' as const,
  click_units: 'MRAD',
  click_vertical: 0.1,
  illuminated: false,
  true_magnification: null,
  name: 'Test',
};

describe('ReticleViewer — POI overlay', () => {
  it('renders no POI when showPoiAt is absent', () => {
    const { queryByTestId } = render(
      <ReticleViewer reticle={baseReticle as any} size={400} />
    );
    expect(queryByTestId('reticle-poi')).toBeNull();
  });

  it('renders the POI dot + label when showPoiAt is provided', () => {
    const { getByTestId, container } = render(
      <ReticleViewer
        reticle={baseReticle as any}
        size={400}
        showPoiAt={{ distanceM: 70, dropMm: -80, driftMm: 0 }}
      />
    );
    const poi = getByTestId('reticle-poi');
    expect(poi).toBeTruthy();
    expect(poi.querySelector('circle')).toBeTruthy();
    expect(poi.querySelector('text')?.textContent).toBe('70m');
    // Drop négatif (sous LOS) → POI sous le centre (y > size/2).
    const cy = parseFloat(poi.querySelector('circle')!.getAttribute('cy')!);
    expect(cy).toBeGreaterThan(200);
  });

  it('positions POI above center when drop is positive (above LOS)', () => {
    const { getByTestId } = render(
      <ReticleViewer
        reticle={baseReticle as any}
        size={400}
        showPoiAt={{ distanceM: 35, dropMm: 28, driftMm: 0 }}
      />
    );
    const cy = parseFloat(getByTestId('reticle-poi').querySelector('circle')!.getAttribute('cy')!);
    expect(cy).toBeLessThan(200);
  });

  it('applies SFP scaling: doubling current mag halves the POI offset', () => {
    // ReticleCatalogEntry-like shape : doit avoir reticle_id + pattern_type
    const sfpReticle = {
      ...baseReticle,
      reticle_id: 'test-sfp',
      focal_plane: 'SFP' as const,
      true_magnification: 10,
    };
    const { container: c1, unmount: u1 } = render(
      <ReticleViewer reticle={sfpReticle as any} size={400}
        currentMagnification={10}
        showPoiAt={{ distanceM: 70, dropMm: -80, driftMm: 0 }} />
    );
    const cy1 = parseFloat(
      c1.querySelector('[data-testid="reticle-poi"] circle')!.getAttribute('cy')!
    );
    u1();
    const { container: c2, unmount: u2 } = render(
      <ReticleViewer reticle={sfpReticle as any} size={400}
        currentMagnification={20}
        showPoiAt={{ distanceM: 70, dropMm: -80, driftMm: 0 }} />
    );
    const cy2 = parseFloat(
      c2.querySelector('[data-testid="reticle-poi"] circle')!.getAttribute('cy')!
    );
    u2();
    // À mag×2, scale = trueMag/currentMag = 0.5 → distance au centre divisée par 2.
    const off1 = cy1 - 200;
    const off2 = cy2 - 200;
    expect(Math.abs(off2 / off1 - 0.5)).toBeLessThan(0.05);
  });

  it('subtracts turret elevation from drop angle', () => {
    const { container: cNo, unmount: uNo } = render(
      <ReticleViewer reticle={baseReticle as any} size={400}
        showPoiAt={{ distanceM: 70, dropMm: -80, driftMm: 0 }} />
    );
    const cyNo = parseFloat(
      cNo.querySelector('[data-testid="reticle-poi"] circle')!.getAttribute('cy')!
    );
    uNo();
    const { container: cW, unmount: uW } = render(
      <ReticleViewer reticle={baseReticle as any} size={400}
        turretElevationMoa={-3.93}
        showPoiAt={{ distanceM: 70, dropMm: -80, driftMm: 0 }} />
    );
    const cyWith = parseFloat(
      cW.querySelector('[data-testid="reticle-poi"] circle')!.getAttribute('cy')!
    );
    uW();
    // Compensation tourelle ≈ drop angle → POI revient près du centre.
    expect(Math.abs(cyWith - 200)).toBeLessThan(Math.abs(cyNo - 200));
  });
});