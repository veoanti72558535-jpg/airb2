/**
 * Tests for the SI guardrail logic exposed by the `ballistic-compute`
 * edge function. We re-implement the (small) pure helpers locally rather
 * than importing the Deno file directly — Vitest can't resolve
 * `https://esm.sh/...` imports, and the helpers are deliberately small
 * enough that the duplication doubles as a contract pin.
 *
 * If you change `FORBIDDEN_SUFFIXES`, `FORBIDDEN_TOKENS`, `SI_BOUNDS` or
 * the walker in the edge function, mirror the change here so the test
 * suite continues to enforce the contract.
 */
import { describe, it, expect } from 'vitest';

const FORBIDDEN_SUFFIXES = [
  '_fps', '_yd', '_yds', '_gr', '_gn', '_in', '_inch', '_mph',
  '_lbs', '_lb', '_oz', '_f', '_fahrenheit', '_inhg', '_psi',
  '_kmh', '_kph', '_mi', '_mile', '_miles', '_ft', '_feet',
  '_cm', '_mm_display', '_mil_display', '_moa_display',
] as const;

const FORBIDDEN_TOKENS = [
  'fps', 'mph', 'inhg', 'lbs', 'grains', 'yards', 'inches',
  'fahrenheit', 'displayunit', 'displayvalue',
];

function keyMentionsDisplayUnit(key: string): string | null {
  const lower = key.toLowerCase();
  for (const sfx of FORBIDDEN_SUFFIXES) {
    if (lower.endsWith(sfx)) return sfx;
  }
  for (const tok of FORBIDDEN_TOKENS) {
    if (lower.includes(tok)) return tok;
  }
  return null;
}

function assertNoDisplayUnitKeys(node: unknown, path = '$'): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertNoDisplayUnitKeys(item, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (path === '$' && k === 'units') continue;
    const hit = keyMentionsDisplayUnit(k);
    if (hit) throw new Error(`Display-unit key at ${path}.${k} (${hit})`);
    assertNoDisplayUnitKeys(v, `${path}.${k}`);
  }
}

const SI_BOUNDS = {
  muzzleVelocity: { min: 30, max: 2000 },
  projectileWeight: { min: 0.05, max: 100 },
  temperature: { min: -60, max: 60 },
  pressure: { min: 500, max: 1100 },
  windSpeed: { min: 0, max: 100 },
} as const;

function inBound(field: keyof typeof SI_BOUNDS, value: number): boolean {
  const b = SI_BOUNDS[field];
  return value >= b.min && value <= b.max;
}

describe('ballistic-compute SI guardrail — key detection', () => {
  it('rejects suffixed display-unit keys', () => {
    expect(keyMentionsDisplayUnit('muzzleVelocity_fps')).toBe('_fps');
    expect(keyMentionsDisplayUnit('weight_gr')).toBe('_gr');
    expect(keyMentionsDisplayUnit('range_yd')).toBe('_yd');
    expect(keyMentionsDisplayUnit('temperature_F')).toBe('_f');
    expect(keyMentionsDisplayUnit('pressure_inHg')).toBe('_inhg');
    expect(keyMentionsDisplayUnit('windSpeed_mph')).toBe('_mph');
  });

  it('rejects tokens embedded in camelCase keys', () => {
    expect(keyMentionsDisplayUnit('muzzleVelocityFps')).toBe('fps');
    expect(keyMentionsDisplayUnit('weightGrains')).toBe('grains');
    expect(keyMentionsDisplayUnit('displayUnitOverride')).toBe('displayunit');
  });

  it('accepts legitimate SI keys', () => {
    expect(keyMentionsDisplayUnit('muzzleVelocity')).toBeNull();
    expect(keyMentionsDisplayUnit('projectileWeight')).toBeNull();
    expect(keyMentionsDisplayUnit('zeroRange')).toBeNull();
    expect(keyMentionsDisplayUnit('temperature')).toBeNull();
    expect(keyMentionsDisplayUnit('pressure')).toBeNull();
    expect(keyMentionsDisplayUnit('windSpeed')).toBeNull();
    expect(keyMentionsDisplayUnit('bc')).toBeNull();
    expect(keyMentionsDisplayUnit('dragModel')).toBeNull();
  });

  it('walks nested objects depth-first', () => {
    const ok = {
      units: 'SI',
      muzzleVelocity: 280,
      weather: { temperature: 20, pressure: 1013, windSpeed: 3 },
      engineConfig: { integrator: 'euler', dt: 5e-4 },
    };
    expect(() => assertNoDisplayUnitKeys(ok)).not.toThrow();

    const sneaky = {
      units: 'SI',
      muzzleVelocity: 280,
      weather: { temperature_F: 68, pressure: 1013 },
    };
    expect(() => assertNoDisplayUnitKeys(sneaky)).toThrow(/temperature_F/);
  });

  it('walks arrays', () => {
    const bad = { units: 'SI', drops: [{ range_yd: 100 }] };
    expect(() => assertNoDisplayUnitKeys(bad)).toThrow(/range_yd/);
  });

  it('does not flag the root `units` sentinel', () => {
    expect(() => assertNoDisplayUnitKeys({ units: 'SI' })).not.toThrow();
  });
});

describe('ballistic-compute SI guardrail — physical bounds', () => {
  it('accepts plausible SI muzzle velocities (PCP airgun range)', () => {
    expect(inBound('muzzleVelocity', 280)).toBe(true);
    expect(inBound('muzzleVelocity', 350)).toBe(true);
  });

  it('rejects fps-as-m/s injection (e.g. 2700 fps sent as 2700 m/s)', () => {
    expect(inBound('muzzleVelocity', 2700)).toBe(false);
  });

  it('rejects grains-as-grams injection (18 gr ≈ 1.17 g, but 18 g impossible for a pellet — bound is loose at 100 g)', () => {
    expect(inBound('projectileWeight', 1.17)).toBe(true);
    expect(inBound('projectileWeight', 250)).toBe(false); // grains misread as grams
  });

  it('rejects °F-as-°C injection', () => {
    expect(inBound('temperature', 20)).toBe(true);    // 20 °C OK
    expect(inBound('temperature', 95)).toBe(false);   // 95 °F sent as °C
  });

  it('rejects inHg-as-hPa injection', () => {
    expect(inBound('pressure', 1013)).toBe(true);     // hPa OK
    expect(inBound('pressure', 29.92)).toBe(false);   // inHg sent as hPa
  });

  it('rejects mph-as-m/s wind speed injection', () => {
    expect(inBound('windSpeed', 5)).toBe(true);
    expect(inBound('windSpeed', 150)).toBe(false);    // ~150 fps sent as m/s
  });
});

describe('ballistic-compute SI guardrail — sentinel contract', () => {
  it('a well-formed SI payload passes both walks', () => {
    const payload = {
      units: 'SI' as const,
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 1.17,
      sightHeight: 38,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 10,
      weather: {
        temperature: 20, humidity: 50, pressure: 1013,
        altitude: 100, windSpeed: 3, windAngle: 90,
      },
    };
    expect(() => assertNoDisplayUnitKeys(payload)).not.toThrow();
    expect(inBound('muzzleVelocity', payload.muzzleVelocity)).toBe(true);
    expect(inBound('projectileWeight', payload.projectileWeight)).toBe(true);
    expect(inBound('temperature', payload.weather.temperature)).toBe(true);
    expect(inBound('pressure', payload.weather.pressure)).toBe(true);
    expect(inBound('windSpeed', payload.weather.windSpeed)).toBe(true);
  });
});