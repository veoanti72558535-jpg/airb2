/**
 * G3 — Interactive Range Simulator.
 * Canvas-based shooting simulator with real ballistic calculations.
 * Wind moves in real-time, user clicks to shoot, impact is calculated
 * from the ballistic engine. Score and feedback instant.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Wind, RotateCcw, Target, Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { calculateTrajectory } from '@/lib/ballistics';
import { sessionStore } from '@/lib/storage';
import type { Session, BallisticResult } from '@/lib/types';
import { useUnits } from '@/hooks/use-units';

interface Shot {
  x: number; // mm offset from center
  y: number; // mm offset from center
  distance: number;
  windSpeed: number;
  hit: boolean; // inside kill zone
  timestamp: number;
}

/** Kill zone sizes in mm (Field Target standard) */
const KILL_ZONES: Record<number, number> = {
  10: 40,
  15: 40,
  20: 35,
  25: 30,
  30: 25,
  35: 20,
  40: 15,
  45: 15,
  50: 15,
  55: 15,
};

function getKillZoneMm(distance: number): number {
  const d = Math.round(distance / 5) * 5;
  return KILL_ZONES[d] ?? 25;
}

export default function RangeSimulatorPage() {
  const { t } = useI18n();
  const { display, symbol } = useUnits();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessions = useMemo(() => sessionStore.getAll(), []);
  const [selectedSessionId, setSelectedSessionId] = useState(
    sessions.length > 0 ? sessions[sessions.length - 1].id : '',
  );
  const [distance, setDistance] = useState(30);
  const [windSpeed, setWindSpeed] = useState(2);
  const [windAngle, setWindAngle] = useState(90); // 90 = right crosswind
  const [shots, setShots] = useState<Shot[]>([]);
  const [lastImpact, setLastImpact] = useState<{ x: number; y: number } | null>(null);
  const [windOscillation, setWindOscillation] = useState(0);

  const session = useMemo(
    () => (selectedSessionId ? sessionStore.getById(selectedSessionId) ?? null : null),
    [selectedSessionId],
  );

  // Compute trajectory for current conditions
  const results = useMemo(() => {
    if (!session) return [];
    try {
      return calculateTrajectory({
        ...session.input,
        maxRange: Math.max(session.input.maxRange, distance + 10),
        weather: {
          ...session.input.weather,
          windSpeed: windSpeed + Math.sin(windOscillation) * 0.5,
          windAngle,
        },
      });
    } catch {
      return session.results ?? [];
    }
  }, [session, distance, windSpeed, windAngle, windOscillation]);

  // Find row at distance
  const currentRow = useMemo(() => {
    if (results.length === 0) return null;
    let closest = results[0];
    for (const r of results) {
      if (Math.abs(r.range - distance) < Math.abs(closest.range - distance)) {
        closest = r;
      }
    }
    return closest;
  }, [results, distance]);

  // Wind oscillation (simulates gusting)
  useEffect(() => {
    const interval = setInterval(() => {
      setWindOscillation((prev) => prev + 0.1);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Draw target on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const killZoneMm = getKillZoneMm(distance);
    // Scale: 1mm = 2px at 30m, scales with distance
    const scale = (2 * 30) / distance;
    const killRadius = (killZoneMm / 2) * scale;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Target rings (FT style)
    const rings = [50, 40, 30, 20, 10, 5]; // mm radius
    rings.forEach((r) => {
      const rPx = r * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Kill zone (green circle)
    ctx.beginPath();
    ctx.arc(cx, cy, killRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Kill zone label
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${display('length', killZoneMm).toFixed(0)}${symbol('length')}`,
      cx,
      cy + killRadius + 14,
    );

    // Crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Draw previous shots
    shots.forEach((shot) => {
      const sx = cx + shot.x * scale;
      const sy = cy - shot.y * scale; // invert Y
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = shot.hit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.fill();
      ctx.strokeStyle = shot.hit ? '#22C55E' : '#EF4444';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw last impact with animation pulse
    if (lastImpact) {
      const sx = cx + lastImpact.x * scale;
      const sy = cy - lastImpact.y * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Wind indicator arrow
    const windRad = ((windAngle - 90) * Math.PI) / 180;
    const windStrength = windSpeed + Math.sin(windOscillation) * 0.5;
    const arrowLen = Math.min(windStrength * 8, 50);
    const arrowX = cx + Math.cos(windRad) * arrowLen;
    const arrowY = cy + Math.sin(windRad) * arrowLen;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(arrowX, arrowY);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Arrowhead
    const headAngle = Math.atan2(arrowY - cy, arrowX - cx);
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 8 * Math.cos(headAngle - 0.4), arrowY - 8 * Math.sin(headAngle - 0.4));
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 8 * Math.cos(headAngle + 0.4), arrowY - 8 * Math.sin(headAngle + 0.4));
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.stroke();
  }, [shots, lastImpact, distance, windSpeed, windAngle, windOscillation]);

  const handleShoot = useCallback(() => {
    if (!currentRow) return;

    const killZoneMm = getKillZoneMm(distance);
    // Apply some human error (gaussian-ish random)
    const humanError = () => (Math.random() + Math.random() + Math.random() - 1.5) * 3;

    // Impact = ballistic wind drift + human error
    const impactX = currentRow.windDrift + humanError(); // mm lateral
    const impactY = currentRow.drop / (distance / 10) + humanError(); // mm vertical (scaled)

    const distFromCenter = Math.sqrt(impactX * impactX + impactY * impactY);
    const hit = distFromCenter <= killZoneMm / 2;

    const shot: Shot = {
      x: impactX,
      y: impactY,
      distance,
      windSpeed,
      hit,
      timestamp: Date.now(),
    };

    setShots((prev) => [...prev, shot]);
    setLastImpact({ x: impactX, y: impactY });
  }, [currentRow, distance, windSpeed]);

  const resetShots = () => {
    setShots([]);
    setLastImpact(null);
  };

  const hitCount = shots.filter((s) => s.hit).length;
  const hitRate = shots.length > 0 ? Math.round((hitCount / shots.length) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-heading font-bold">{t('nav.rangeSimulator' as any) || 'Simulateur de Tir'}</h1>
      </div>

      {/* Session selector */}
      <select
        value={selectedSessionId}
        onChange={(e) => setSelectedSessionId(e.target.value)}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Canvas target */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          className="w-full aspect-square rounded-2xl border border-border/30 cursor-crosshair"
          onClick={handleShoot}
        />
        {/* Score overlay */}
        <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/30">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Score</div>
          <div className="text-lg font-mono font-bold text-primary">{hitCount}/{shots.length}</div>
          <div className="text-[9px] font-mono text-muted-foreground">{hitRate}%</div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Distance */}
        <div className="surface-elevated rounded-xl p-3 space-y-1">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Crosshair className="h-3 w-3" /> Distance
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDistance((d) => Math.max(10, d - 5))} className="p-1 rounded bg-muted hover:bg-muted/70"><ChevronDown className="h-3 w-3" /></button>
            <span className="text-lg font-mono font-bold flex-1 text-center">{display('distance', distance).toFixed(0)}<span className="text-xs text-muted-foreground ml-1">{symbol('distance')}</span></span>
            <button onClick={() => setDistance((d) => Math.min(100, d + 5))} className="p-1 rounded bg-muted hover:bg-muted/70"><ChevronUp className="h-3 w-3" /></button>
          </div>
        </div>

        {/* Wind */}
        <div className="surface-elevated rounded-xl p-3 space-y-1">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Wind className="h-3 w-3" /> Vent
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWindSpeed((w) => Math.max(0, w - 1))} className="p-1 rounded bg-muted hover:bg-muted/70"><ChevronDown className="h-3 w-3" /></button>
            <span className="text-lg font-mono font-bold flex-1 text-center">{display('velocity', windSpeed).toFixed(1)}<span className="text-xs text-muted-foreground ml-1">{symbol('velocity')}</span></span>
            <button onClick={() => setWindSpeed((w) => Math.min(15, w + 1))} className="p-1 rounded bg-muted hover:bg-muted/70"><ChevronUp className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleShoot}
          disabled={!session}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40"
        >
          <Crosshair className="h-4 w-4" />
          Tirer
        </button>
        <button
          onClick={resetShots}
          className="px-4 py-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      {shots.length > 0 && (
        <div className="surface-elevated rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statistiques</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-green-500">{hitCount}</div>
              <div className="text-[8px] text-muted-foreground uppercase">Touchés</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-red-500">{shots.length - hitCount}</div>
              <div className="text-[8px] text-muted-foreground uppercase">Manqués</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-foreground">{hitRate}%</div>
              <div className="text-[8px] text-muted-foreground uppercase">Précision</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-foreground">{shots.length}</div>
              <div className="text-[8px] text-muted-foreground uppercase">Total</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
