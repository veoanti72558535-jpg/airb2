/**
 * G1 — Field Mode: ultra-simplified full-screen shooting interface.
 * Distance → correction in clicks (displayed large). GPS + weather auto.
 * Button to log each shot for the shooting diary.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Wind, Thermometer, MapPin, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore, opticStore } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticResult, Session } from '@/lib/types';
import { useUnits } from '@/hooks/use-units';

export default function FieldModePage() {
  const { t } = useI18n();
  const { display, symbol } = useUnits();
  const lenSym = symbol('length');
  const velSym = symbol('velocity');
  const enSym = symbol('energy');
  const sessions = useMemo(() => sessionStore.getAll(), []);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions.length > 0 ? sessions[sessions.length - 1].id : '',
  );
  const [targetDistance, setTargetDistance] = useState(30);
  const [shotLog, setShotLog] = useState<{ distance: number; time: string; hit: boolean }[]>([]);

  const session = useMemo(
    () => (selectedSessionId ? sessionStore.getById(selectedSessionId) ?? null : null),
    [selectedSessionId],
  );

  const results = useMemo(() => {
    if (!session) return [];
    try {
      return calculateTrajectory({
        ...session.input,
        maxRange: Math.max(session.input.maxRange, targetDistance + 10),
      });
    } catch {
      return session.results ?? [];
    }
  }, [session, targetDistance]);

  // Find the row closest to targetDistance
  const currentRow = useMemo(() => {
    if (results.length === 0) return null;
    let closest = results[0];
    for (const r of results) {
      if (Math.abs(r.range - targetDistance) < Math.abs(closest.range - targetDistance)) {
        closest = r;
      }
    }
    return closest;
  }, [results, targetDistance]);

  const clickUnit = session?.input.clickUnit ?? 'MRAD';
  const clicksElev = currentRow?.clicksElevation ?? 0;
  const clicksWind = currentRow?.clicksWindage ?? 0;

  const holdover = clickUnit === 'MRAD'
    ? currentRow?.holdoverMRAD ?? 0
    : currentRow?.holdover ?? 0;

  const logShot = useCallback((hit: boolean) => {
    setShotLog((prev) => [
      ...prev,
      { distance: targetDistance, time: new Date().toLocaleTimeString(), hit },
    ]);
  }, [targetDistance]);

  const adjustDistance = useCallback((delta: number) => {
    setTargetDistance((prev) => Math.max(5, Math.min(200, prev + delta)));
  }, []);

  if (sessions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted-foreground">
          <Crosshair className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">{t('calc.empty' as any) || 'Créez une session d\'abord'}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 max-w-lg mx-auto"
    >
      {/* Session selector */}
      <select
        value={selectedSessionId}
        onChange={(e) => setSelectedSessionId(e.target.value)}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Distance selector — big and touch-friendly */}
      <div className="surface-elevated rounded-2xl p-6 text-center space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Distance
        </div>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => adjustDistance(-5)}
            className="h-14 w-14 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors active:scale-95"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <div className="text-6xl font-mono font-bold tabular-nums text-foreground min-w-[120px]">
            {targetDistance}
            <span className="text-lg text-muted-foreground ml-1">m</span>
          </div>
          <button
            onClick={() => adjustDistance(5)}
            className="h-14 w-14 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors active:scale-95"
          >
            <ChevronUp className="h-6 w-6" />
          </button>
        </div>
        {/* Quick distance buttons */}
        <div className="flex gap-2 justify-center flex-wrap">
          {[10, 20, 30, 40, 50, 75, 100].map((d) => (
            <button
              key={d}
              onClick={() => setTargetDistance(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                targetDistance === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Correction display — THE MAIN INFO */}
      {currentRow && (
        <div className="grid grid-cols-2 gap-3">
          {/* Elevation */}
          <div className="surface-elevated rounded-2xl p-5 text-center">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
              {t('calc.elevation' as any) || 'Élévation'}
            </div>
            <div className={`text-4xl font-mono font-bold tabular-nums ${
              clicksElev > 0 ? 'text-green-500' : clicksElev < 0 ? 'text-red-500' : 'text-foreground'
            }`}>
              {clicksElev > 0 ? '+' : ''}{clicksElev}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              clics ({clickUnit})
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-2 border-t border-border/40 pt-2">
              {holdover > 0 ? '+' : ''}{holdover.toFixed(2)} {clickUnit}
            </div>
          </div>

          {/* Windage */}
          <div className="surface-elevated rounded-2xl p-5 text-center">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
              <Wind className="h-3 w-3 inline mr-1" />
              {t('calc.windage' as any) || 'Vent'}
            </div>
            <div className={`text-4xl font-mono font-bold tabular-nums ${
              clicksWind > 0 ? 'text-blue-500' : clicksWind < 0 ? 'text-orange-500' : 'text-foreground'
            }`}>
              {clicksWind > 0 ? 'R ' : clicksWind < 0 ? 'L ' : ''}{Math.abs(clicksWind)}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              clics ({clickUnit})
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-2 border-t border-border/40 pt-2">
              {display('length', currentRow.windDrift).toFixed(1)} {lenSym}
            </div>
          </div>
        </div>
      )}

      {/* Secondary info strip */}
      {currentRow && (
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Chute" value={`${display('length', currentRow.drop).toFixed(1)}`} unit={lenSym} />
          <MiniStat label="Vit." value={`${Math.round(display('velocity', currentRow.velocity))}`} unit={velSym} />
          <MiniStat label="Énergie" value={`${display('energy', currentRow.energy).toFixed(1)}`} unit={enSym} />
          <MiniStat label="TdV" value={`${currentRow.tof.toFixed(3)}`} unit="s" />
        </div>
      )}

      {/* Shot logger */}
      <div className="surface-elevated rounded-2xl p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium text-center">
          Journal de tir
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => logShot(true)}
            className="flex-1 py-3 rounded-xl bg-green-500/10 text-green-500 border border-green-500/30 text-sm font-semibold hover:bg-green-500/20 transition-colors active:scale-95"
          >
            ✓ Touché
          </button>
          <button
            onClick={() => logShot(false)}
            className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 text-sm font-semibold hover:bg-red-500/20 transition-colors active:scale-95"
          >
            ✗ Manqué
          </button>
        </div>
        {shotLog.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {shotLog.slice().reverse().map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-muted-foreground py-1 border-b border-border/30 last:border-0">
                <span className="font-mono">{s.time}</span>
                <span>{s.distance}m</span>
                <span className={s.hit ? 'text-green-500' : 'text-red-500'}>
                  {s.hit ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        )}
        {shotLog.length > 0 && (
          <div className="text-center text-[10px] text-muted-foreground">
            {shotLog.filter((s) => s.hit).length}/{shotLog.length} touchés ({
              Math.round((shotLog.filter((s) => s.hit).length / shotLog.length) * 100)
            }%)
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="surface-card rounded-xl px-2 py-2 text-center">
      <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-mono font-semibold tabular-nums">
        {value}
        <span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
