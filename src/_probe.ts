import { calculateTrajectory } from './lib/ballistics';
const w = { temperature:15, humidity:0, pressure:1013.25, altitude:0, windSpeed:0, windAngle:0, source:'manual' as const, timestamp:'' };
for (const maxRange of [50, 60, 80, 100]) {
  const out = calculateTrajectory({ muzzleVelocity:280, bc:0.025, projectileWeight:18, sightHeight:40, zeroRange:30, maxRange, rangeStep:10, weather:w });
  console.log(`maxRange=${maxRange}  drop@30=${out.find(r=>r.range===30)!.drop}`);
}
