import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage BEFORE importing repo
const createMock = vi.fn();
const getAllMock = vi.fn().mockReturnValue([]);
vi.mock('@/lib/storage', () => ({
  reticleStore: {
    create: (...args: unknown[]) => createMock(...args),
    getAll: () => getAllMock(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

import {
  importChairgunToLibrary,
  isChairgunImported,
  __test__,
  type ChairgunReticle,
} from './chairgun-reticles-repo';

function reticle(over: Partial<ChairgunReticle> = {}): ChairgunReticle {
  return {
    reticle_id: 42,
    name: 'CG Test',
    focal_plane: 'FFP',
    unit: 'MRAD',
    true_magnification: 12,
    elements: [{ type: 'dot', x: 0, y: 0, radius: 0 }],
    element_count: 1,
    ...over,
  };
}

describe('chairgun-reticles-repo', () => {
  beforeEach(() => {
    createMock.mockReset();
    getAllMock.mockReset().mockReturnValue([]);
  });

  it('normalizeElements coerces unknown shapes safely', () => {
    const out = __test__.normalizeElements([
      { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
      { type: 'dot', x: 0, y: 0, radius: 0.5 },
      { type: 'garbage' as any, x1: 'nope' as any },
      null,
      'not-an-object' as any,
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 });
    expect(out[1]).toEqual({ type: 'dot', x: 0, y: 0, radius: 0.5 });
    // Coerced to line with no usable numeric coords
    expect(out[2].type).toBe('line');
  });

  it('mapUnit MOA → MOA, anything else → MRAD', () => {
    expect(__test__.mapUnit('MOA')).toBe('MOA');
    expect(__test__.mapUnit('MRAD')).toBe('MRAD');
    expect(__test__.mapUnit('CM/100M')).toBe('MRAD');
    expect(__test__.mapUnit(null)).toBe('MRAD');
  });

  it('importChairgunToLibrary calls reticleStore.create with brand=ChairGun and catalogReticleId', () => {
    importChairgunToLibrary(reticle());
    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0];
    expect(arg.brand).toBe('ChairGun');
    expect(arg.model).toBe('CG Test');
    expect(arg.catalogReticleId).toBe(42);
    expect(arg.unit).toBe('MRAD');
    // CRITICAL: no `elements` field persisted
    expect(arg).not.toHaveProperty('elements');
  });

  it('isChairgunImported requires brand=ChairGun match', () => {
    getAllMock.mockReturnValue([
      { brand: 'Strelok', catalogReticleId: 42 }, // wrong brand → false
    ]);
    expect(isChairgunImported(42)).toBe(false);

    getAllMock.mockReturnValue([
      { brand: 'ChairGun', catalogReticleId: 42 },
    ]);
    expect(isChairgunImported(42)).toBe(true);
    expect(isChairgunImported(99)).toBe(false);
  });
});