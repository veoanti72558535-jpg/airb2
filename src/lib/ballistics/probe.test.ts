import { describe, it } from 'vitest';
import { calculateTrajectory } from './index';
import type { BallisticInput, WeatherSnapshot } from '../types';
import { cdFromG1Table } from './drag/g1-table';

const w: WeatherSnapshot = { temperature: 20, humidity: 25, pressure: 1014.58, altitude: 770, windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '' };
function inp(mv: number, cfg?: any): BallisticInput {
  return { muzzleVelocity: mv, bc: 0.084, projectileWeight: 25.39, sightHeight: 47, zeroRange: 50, maxRange: 100, rangeStep: 5, weather: w, dragModel: 'G1' as any, engineConfig: cfg };
}
const baseCfg = { dt: 0.0005, atmosphereModel: 'icao-simple' as const, windModel: 'lateral-only' as const, postProcess: { spinDrift: false, coriolis: false, cant: false, slopeAngle: false } };

describe('PROBE — Heun/Euler comparison', () => {
  it('prints reference scenarios', () => {
    const cfgs: Array<[string, any]> = [
      ['legacy(undef)', undefined],
      ['euler-cfg', { ...baseCfg, integrator: 'euler' }],
      ['heun-cfg', { ...baseCfg, integrator: 'heun' }],
    ];
    const targets = [[280, 70, -83, 246], [300, 80, -129, 255.6], [260, 35, 28, 244.6]];
    for (const [name, cfg] of cfgs) {
      console.log(`\n=== ${name} ===`);
      for (const [mv, dist, refDrop, refV] of targets) {
        const out = calculateTrajectory(inp(mv, cfg));
        const r = out.find(x => x.range === dist)!;
        console.log(`MV=${mv} @${dist}m drop=${r.drop.toFixed(1)} (ref ${refDrop})  v=${r.velocity.toFixed(1)} (ref ${refV})`);
      }
    }
    console.log('\n=== G1 table samples ===');
    for (const m of [0, 0.5, 0.82, 1.0]) console.log(`Mach ${m} = ${cdFromG1Table(m).toFixed(4)}`);
  });
});